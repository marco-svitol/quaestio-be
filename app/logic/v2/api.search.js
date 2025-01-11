const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const utils=require('../../utils');
const cacheH = require("../../consts/cache").cacheHandler;

exports.search = async(req, res, next) => {
	//validate params middleware??
	const reqQuery = await buildQuery(req.query, req.auth.userInfo.pattodate_org_id);

	if (!reqQuery) {
		logger.warn('search: The query for OPS is empty: nothing to search.');
		return res.status(200).send({});
	}

	logger.debug(reqQuery);
	
	opsQuaestio.publishedDataSearch(reqQuery, req.auth.userInfo, (err, body, cacheHit) => {
		if (!err) {
			logger.debug(`publishedDataSearch: total filtered and grouped by family: ${body.length}`);
			db._gethistory(req.auth.payload.sub, (err, familyhistory, dochistory) => { 
				if (!err){
					const histBody = body.map(doc => {
						let f = null;
						let d = null;
						if (familyhistory){
							f = familyhistory.find(hdoc => hdoc.familyid == doc.familyid);
						}
						if (dochistory){
							d = dochistory.find(hdoc => hdoc.docid === doc.doc_num);
						}
						doc.read_history = f?.status?status[f.status]:status[0];
						doc.bookmark = d?.bookmark?d.bookmark:false;
						doc.notes = f?.notes?f.notes:"";
						doc.bmfolderid = d?.bmfolderid?d.bmfolderid:"";
						return doc;
					})
					body = histBody.sort((a,b) => b.date - a.date);
					
					res.locals.cacheHit = cacheHit;
					res.locals.status = 200;
					res.locals.body = body;

					return next();
				}else{
					logger.error(`publishedDataSearch:gethistory ${err.message}. Stack: ${err.stack}`);
					return res.status(500).json({message: `search: ${msgServerError}`});
				}
			})
		}else{
			let error = {
						status : null,
						message : ''
						};
			if (err?.response?.status === 403 && err?.response?.data){
				// 403 is returned from OPS, but we convert it in a more meaningful 503 for the FE
				error.status = 503;
				const OPSError = utils.parseOPSErrorXML(err.response.data);
				if (OPSError.isOPSError){
					error.message = {
						"OPS_HTTP_STATUS": 403, 
						"OPS_CODE": OPSError.code,
						"OPS_MESSAGE": OPSError.message
					};
				}else{
					error.message  = {
						"HTTP_STATUS":  403,
						"MESSAGE" : err.message
					};
				}
			}else{
				error.status = 500
				error.message = err.message;
				error.stack = err.stack;
			}
			logger.error(`publishedDataSearch: Status: ${error.status}. Message: ${JSON.stringify(error.message)}. Stack: ${error.stack}`);
			return res.status(error.status).json({message: error.message});
		}
	})
}

async function buildQuery(query, orgId) {
  let reqQuery = "";
  
  if (typeof query.doc_num === "string" && query.doc_num.trim() !== "") {
    reqQuery = `pn=${query.doc_num}`;
  } else {
    const conditions = [];
    
    if (query.pa) {
      conditions.push(await getQueryFromId("applicants", query.pa, orgId));
    }
    
    if (query.tecarea) {
      conditions.push(`(${await getQueryFromId("tecareas", query.tecarea, orgId)})`);
    }
    
    if (query.pdfrom) {
      conditions.push(utils.validateDate(query.pdfrom, query.pdto));
    }
    
    if (conditions.length > 0) {
      reqQuery = conditions.join(" AND ");
    }
  }
  
  return reqQuery;
};

async function getQueryFromId (field, id, org_id){
	try{
		const cachedResult = cacheH.getCacheQuery(`${field}|${id}|${org_id}`);
		if (cachedResult){
			return cachedResult;
		}
		const result = await db._getQuery(field, id, org_id);
		cacheH.setCacheQuery(`${field}|${id}|${org_id}`, result);
		return result;
	}
	catch(err){
		logger.error(`getQueryFromId: Query not found with field=${field} id=${id} org_id=${org_id}. ${err.message}`);
		return '';
	}
}

// exports.opendoc = async(req, res, next) => {
// 	//update doc history and return OPS Link
// 	db._updatehistory(req.auth.payload.sub, req.query.doc_num, req.query.familyid, status.indexOf("viewed"), (err) => {
// 		if (err){
// 			logger.error(`opendoc: ${msgServerError}: ${err}`);
// 			return res.status(500).json({message: `opendoc: ${msgServerError}`});
// 		}else{
// 			//retrieve link to firstpageClipping
// 			const opslink = opsQuaestio.getLinkFromDocId(req.query.doc_num);
// 			opsQuaestio.getImagesLinksFromDocId((req.query.doc_num), (imagesLinks, cacheHit) => {
// 				res.locals.cacheHit = cacheHit;
// 				res.locals.status = 200
// 				res.locals.body = {ops_link: opslink, images_links: imagesLinks ? imagesLinks : ""}
// 				return next();
// 			})
// 		}
// 	})
// }
exports.opendoc = async (req, res, next) => {
	try {
		//TODO: to be removed after docStatus is ready
		await new Promise((resolve, reject) => {
			db._docStatus(req.auth.payload.sub, req.query.familyid, status.indexOf("viewed"), (err) => {
			//db._updatehistory(req.auth.payload.sub, req.query.doc_num, req.query.familyid, status.indexOf("viewed"), (err) => {
				if (err) {
					logger.error(`opendoc: ${msgServerError}: ${err}`);
					reject(err);
				} else {
					resolve();
				}
			});
		});

		//retrieve link to firstpageClipping
		const opslink = opsQuaestio.getLinkFromDocId(req.query.doc_num);
		opsQuaestio.getImagesLinksFromDocId(req.query.doc_num, (imagesLinks, cacheHit) => {
			res.locals.cacheHit = cacheHit;
			res.locals.status = 200;
			res.locals.body = { ops_link: opslink, images_links: imagesLinks ? imagesLinks : "" };
			return next();
		});
	} catch (error) {
		return res.status(500).json({ message: `opendoc: ${msgServerError}` });
	}
};

exports.firstpageClipping = async(req, res) => {
	const fpcImage = req.query.fpcImage;
	const fpcImageFormat = req.query.fpcImageFormat;
	opsQuaestio.getImage(fpcImage, fpcImageFormat, 1, (err,body, headers) => {
		if (!err) {
			res.writeHead(200, {
				'Content-Type': headers['content-type']
			  });
			body.pipe(res);
		}else{
			logger.error(`firstpageClipping: ${err}`)
			return res.status(500).json({message: `firstpageClipping: ${msgServerError}`});
		}
	})
} 

exports.docStatus = async(req, res) => {
	db._docStatus(req.auth.payload.sub, req.query.familyid, status.indexOf(req.query.status), (err) => {
		if (err) {
			logger.error(`docStatus: ${msgServerError}: ${err}`);
			return res.status(500).json({ message: `docStatus: ${msgServerError}` });
		} else {
			return res.status(200).json({ message: 'ok'});
		}
	});
} 
