const logger=require('../../logger'); 
const tokenProperties = global.config_data.tokenProperties;
const db=require('../../database');
const jwt = require('jsonwebtoken');
const msgDbError = require('../../consts').msgDatabaseError;

exports.login = async(req, res) => {
	const username = req.query.username;
	const password = req.query.password;
	//if (username == null || password == null || username == '' || password ==''){return res.status(400).send("Bad request, check params please")}
	db._login(username,password, function (err, qresult) {
	  if (err) {
		logger.error(msgDbError+": "+err);
		res.status(500).send(msgDbError);
		return;
	  }else{
		if (qresult.success){
		  //req.session.username = username;
		  var token = createToken(qresult.uid, tokenProperties.secret, tokenProperties.tokenTimeout);
			var refreshToken = createToken(qresult.uid, tokenProperties.refresh_secret, tokenProperties.refresh_tokenTimeout);  
			logger.debug(`Login OK for user ${username} (${qresult.uid}). Token expires in ${Math.round(tokenProperties.tokenTimeout / 6)/10} minutes, refresh token in ${Math.round(tokenProperties.refresh_tokenTimeout / 6)/10}`);
		  res.status(200).json({ uid: qresult.uid, token: token, refreshtoken: refreshToken});
		}else{
		  logger.warn(`Login failed for user ${username}: ${qresult.message}`);
		  res.status(401).send();
		}
	  }
	})
}

function createToken(uid, secret, timeout){
	return jwt.sign({ uid: uid }, secret, {expiresIn: timeout});
}

exports.checkJWT = async function (req, res, next) { //Function used by Router to verify token
	if (req.headers.authorization) {// check headers params
		logger.verbose (req.headers.authorization)
		jwt.verify(req.headers.authorization, tokenProperties.secret, function (err, decoded) {  // check valid token
			if (err) {
				logger.error(`checkJWT: ${err.name}: ${err.message}`);
				res.statusMessage = 'You are not authorized';
				return res.status(401).json({message:`${err.name}: ${err.message}`})
			} else if (decoded && (decoded.uid == req.query.uid)){ //check that uid in token matches uid in parameters
				logger.verbose("JWT token ok: authorized")
				next()
			} else {
				logger.error(`JWT token is valid but query userid does not match token's userid`);
				res.statusMessage = 'You are not authorized';
				return res.status(401).json({message:`JWT token is valid but query userid does not match token's userid`})
			}	
		})
	} else {
		logger.error("CheckJWT failed: authorization header is missing. Not authorized");
		res.statusMessage = 'Auth header is missing: you are not authorized';
		return res.status(401).json({message:'Auth header is missing: you are not authorized'})
	}
}

exports.refresh = async function (req, res) {
	jwt.verify(req.query.reftoken, tokenProperties.refresh_secret, (err, decoded) => {
		if (err) {
			logger.error(`refresh: ${err.name} : ${err.message}`);
			res.statusMessage = 'You are not authorized';
			return res.status(401).json({message:`refresh :${err.name} : ${err.message}`})
		} else if (decoded && (decoded.uid == req.query.uid)){ //check that uid in token matches userid in parameters
			var token = createToken(req.query.uid, tokenProperties.secret, tokenProperties.tokenTimeout);
			d = new Date(decoded.exp*1000);
			logger.debug(`Refresh token OK for user (${req.query.uid}). Token expires in ${Math.round(tokenProperties.tokenTimeout / 6)/10} minutes, refresh token on ${d.toUTCString()}`);
		  res.status(200).json({token: token});
		} else {
			logger.error(`Refresh token is valid but query userid does not match refresh token's userid`);
			res.statusMessage = 'You are not authorized';
			return res.status(401).json({message:`Refresh token is valid but query userid does not match refresh token's userid`})
		}	
	})
}
