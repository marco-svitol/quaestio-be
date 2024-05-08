const db=require('../../database');
const logger=require('../../logger')
const msgServerError = require('../../consts').msgServerError;
const cacheH = require("../../consts/cache").cacheHandler;

exports.userprofile = async(req, res, next) => {
	//validate params middleware??
	const cacheKey = `${req.auth.payload.sub}|${req.auth.userInfo.pattodate_org_id}`;

	try{
		const cachedResult = cacheH.nodeCache.get(cacheKey);
		if (cachedResult){
			res.locals.cache = 'hit';
			res.locals.status = 200;
			res.locals.body = cachedResult;
		}
		const qResult = await db._userprofile(req.auth.payload.sub, req.auth.userInfo.pattodate_org_id);
		if (qResult?.userprofile?.length > 0){
			qResult.userprofile[0].userinfo.displayname = req.auth.userInfo.name
			cacheH.nodeCache.set(cacheKey, qResult.userprofile, cacheH.calculateTTL());
			res.locals.status = 200;
			res.locals.body = qResult.userprofile;
		}else{
			logger.error(`userprofile: profile not found`);
			return res.status(500).json({message: `userprofile: profile not found`})
		}
	}catch(err){
		logger.error(`userprofile: ${err.message}: ${err}`);
		return res.status(500).json({message: `userprofile: ${msgServerError}`});
	}
	return next();
}