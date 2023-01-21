//const { stream } = require('../logger');
const { REFUSED } = require('dns');
const logger=require('../logger'); 
const msgServerError = 'Server error';
const randomQuote = require ('random-quotes');


async function getCurrentHPAmaxReplicas(){
	//const hpa = await api.readNamespacedHorizontalPodAutoscaler(hpaname, namespace);
	return 1;
}

exports.test = async (req, res) => { 
	logger.srvconsoledir(req,start=0);
	res.status(200).send({quote: randomQuote.default().body, author: randomQuote.default().author})
}
