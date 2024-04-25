const { auth } = require("express-oauth2-jwt-bearer");
const axios = require('axios');
const NodeCache = require('node-cache');
const userInfoCache = new NodeCache({ stdTTL: global.config_data.app.userInfoCacheTTLSeconds });
const logger=require('../logger'); 

const validateAccessTokenMiddleWare = auth({
  issuerBaseURL: `https://${global.config_data.identity.auth0Domain}`,
  audience: global.config_data.identity.auth0AppAudience,
  tokenSigningAlg: 'RS256'
});

module.exports = {
  validateAccessTokenMiddleWare,
};


module.exports.getIdentityInfoMiddleware = function(req, res, next) {
    const accessToken = req.headers.authorization;
    const auth0Domain = global.config_data.identity.auth0Domain;

    const cacheKey = `userInfo_${accessToken}`;
    // Check if the user information exists in the cache
    const cachedUserInfo = userInfoCache.get(cacheKey);
    if (cachedUserInfo !== undefined) {
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
        if (!('pattodate_org_id' in userInfo) || userInfo.pattodate_org_id === null ) {
            logger.error(`For user ${req.auth.payload.sub} I'm unable to fetch user organization id.`)
            const message = `User organization id not available for user ${userInfo.sub}`;
            const status = 500
            return res.status(status).json({ message });
        }
        // Store the user information in the cache with TTL
        userInfoCache.set(cacheKey, userInfo);
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
