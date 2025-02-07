// const { auth } = require("express-oauth2-jwt-bearer");
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const cacheHandler = require("../consts/cache").cacheHandler;
const logger=require('../logger'); 

module.exports.getIdentityInfoMiddleware = function(req, res, next) {
    const accessToken = req.headers.authorization;
    const auth0Domain = global.config_data.identity.auth0Domain;

    const cachedUserInfo = cacheHandler.getCacheIdentityInfo(req.auth.payload.sub);
    if (cachedUserInfo) {
        req.auth.userInfo = cachedUserInfo;
        return next();
    }

    axios.get(`https://${auth0Domain}/userinfo`, {
        headers: {
            Authorization: accessToken
        }
    })
    .then(response => {
        const userInfo = response.data;
        //check if all required user's info are available
        //logger.debug(JSON.stringify(userInfo, null, 2));
        if (!('pattodate_org_id' in userInfo) || userInfo.pattodate_org_id === null ) {
            logger.error(`For user ${req.auth.payload.sub} I'm unable to fetch user organization id.`)
            const message = `User organization id not available for user ${userInfo.sub}`;
            const status = 500
            return res.status(status).json({ message });
        }
        userInfo.pattodate_translationEnabled = (userInfo.pattodate_translationEnabled != null) ? userInfo.pattodate_translationEnabled : global.config_data.ops.opsTranslationEnabled;
        userInfo.pattodate_translateAbstract = (userInfo.pattodate_translateAbstract != null) ? userInfo.pattodate_translateAbstract : global.config_data.ops.opsTranslateAbstract;
        userInfo.pattodate_toLang = (userInfo.pattodate_toLang != null) ? userInfo.pattodate_toLang : global.config_data.ops.opsToLang;
        userInfo.pattodate_friendlyLangs = (userInfo.pattodate_friendlyLangs != null) ? userInfo.pattodate_friendlyLangs : global.config_data.ops.opsFriendlyLangs;
        userInfo.pattodate_defaultOpsLang = (userInfo.pattodate_defaultOpsLang != null) ? userInfo.pattodate_defaultOpsLang : global.config_data.ops.opsDefaultLang;
        // Store the user information in the cache with TTL
        cacheHandler.setCacheIdentityInfo(req.auth.payload.sub, userInfo);
        req.auth.userInfo = userInfo ;
        next();
    })
    .catch(error => {
        logger.error(`Unable to fetch user's info for ${req.auth.payload.sub}: ${error}`)
        const message = `Unable to retrieve user's info for ${req.auth.payload.sub}`;
        const status = 500;
        return res.status(status).json({ message });
    });
};

class Auth0Verifier {
  constructor(auth0Domain, audience) {
    this.auth0Domain = auth0Domain;
    this.audience = audience;
    this.jwksUri = `https://${auth0Domain}/.well-known/jwks.json`;
    this.publicKeys = {}; // Store keys in memory

    // Fetch the signing keys on initialization
    this._loadKeys();
  }

  async _loadKeys() {
    try {
      const client = jwksClient({ jwksUri: this.jwksUri });
      const keys = await client.getSigningKeys();
      this.publicKeys = keys.reduce((acc, key) => {
        acc[key.kid] = key.getPublicKey();
        return acc;
      }, {});
      logger.info("Auth0 public keys loaded successfully.");
    } catch (err) {
      logger.error("Failed to load Auth0 public keys:", err);
      process.exit(1);
    }
  }

  verifyToken(token) {
    return new Promise((resolve, reject) => {
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || !decodedHeader.header) {
        return reject(new Error("Invalid token header"));
      }

      const key = this.publicKeys[decodedHeader.header.kid];
      if (!key) {
        return reject(new Error("Signing key not found"));
      }

      jwt.verify(token, key, {
        audience: this.audience,
        issuer: `https://${this.auth0Domain}/`,
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      });
    });
  }
}


const authVerifier = new Auth0Verifier(global.config_data.identity.auth0Domain, global.config_data.identity.auth0AppAudience);

// Express Middleware for Auth
module.exports.validateAccessTokenMiddleWare = async function(req, res, next){
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await authVerifier.verifyToken(token);
    req.auth = { payload: decoded }; // Attach user info to request
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token", details: err.message });
  }
};
