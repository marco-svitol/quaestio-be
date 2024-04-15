const db=require('../../database');
const logger=require('../../logger')
const msgServerError = require('../../consts').msgServerError;

exports.userprofile = async(req, res) => {
	//validate params middleware??
	db._userprofile(req.auth.payload.sub, req.auth.userInfo.pattodate_org_id, (err, qresult) => {
		if(err){
			logger.error(`userprofile: ${qresult.message}: ${err}`);
			res.status(500).json({message: `userprofile: ${msgServerError}`});
		}else{
			if (qresult.userprofile.length > 0){
				qresult.userprofile[0].userinfo.displayname = req.auth.userInfo.name
				res.status(200).json(qresult.userprofile);
			}else{
				logger.error(`userprofile: profile not found`);
				res.status(500).json({message: `userprofile: profile not found`})
			}
		}
	})
}