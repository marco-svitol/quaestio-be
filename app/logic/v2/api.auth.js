const logger=require('../../logger'); 
const tokenProperties = global.config_data.tokenProperties;
const db=require('../../database');
const jwt = require('jsonwebtoken');
const msgDbError = require('../../consts').msgDatabaseError;

exports.login = async(req, res) => {
	const username = req.body.username;
	const password = req.body.password;
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
			logger.verbose({Response: {uid: qresult.uid, token: '****', refreshtoken: '****'}});
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
