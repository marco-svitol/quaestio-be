const logger=require('../../logger'); 
const msgServerError=require('../../consts').msgServerError; 
const opsQuaestio = require("../../consts").opsQuaestio;

exports.opsMonitoring = async (req, res) => {
	try {
        const opsUsage = opsQuaestio.opsMonitoring.getUsageMB();
        const opsThrottling = opsQuaestio.opsMonitoring.getThrottling();
        return res.status(200).json({opsUsage, opsThrottling});
    }catch(err){
        logger.error(`opsMonitoring: error. ${err} `);
        return res.status(500).json({message: msgServerError});
    }
}
