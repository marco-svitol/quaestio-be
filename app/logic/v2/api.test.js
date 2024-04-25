const logger=require('../../logger'); 
const randomQuote = require ('random-quotes');
const cacheMiddlewareReset = require('../../cache').cacheMiddlewareReset;

exports.cacheReset = async (req, res) => {
	cacheMiddlewareReset();
	return res.status(200).send("Cache cleared");
}

exports.test = async (req, res) => { 
	return res.status(200).send({quote: randomQuote.default().body, author: randomQuote.default().author})
}

exports.opstest = async (req, res) => { 
	logger.debug(`OPSBASEURL:${global.config_data.app.opsBaseUrl} OPSCLIENTID:${global.config_data.app.opsClientID} OPSCLIENTSECRET:${global.config_data.app.opsClientSecret}`);
	return res.status(200).send("Check logs");
}