//const { stream } = require('../logger');
const { REFUSED } = require('dns');
const logger=require('../logger'); 
const msgServerError = 'Server error';



async function getCurrentHPAmaxReplicas(){
	//const hpa = await api.readNamespacedHorizontalPodAutoscaler(hpaname, namespace);
	return 1;
}



exports.test = async (req, res) => { 
	//const targetNamespaceName = global.config_data.namespace;
	try{
		logger.info(`backend: infotest`);
	}catch{
		logger.error(`backend: infotest`);
		return res.status(503).send(`backend: infotest`);
	}
	let HPAmaxReplicas = await getCurrentHPAmaxReplicas();
	//Check if originalDeploymentMinReplicas + numberofExtraReplicas is lower or equal to HPAmaxReplicas
	if (HPAmaxReplicas > 0){
		logger.info(`backend: is ${HPAmaxReplicas}`);
	}
	logger.srvconsoledir(req,start=0);
	re="123test";
	res.status(200).send({re: re});
}
