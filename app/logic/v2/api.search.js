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
	
	opsQuaestio.publishedDataSearch(reqQuery, req.auth.userInfo, (err, body, cache) => {
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
					
					res.locals.cache = cache;
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
	cacheKey = `${field}|${id}|${org_id}`;
	try{
		const cachedResult = cacheH.nodeCache.get(cacheKey);
		if (cachedResult){
			return cachedResult;
		}
		const result = await db._getQuery(field, id, org_id);
		cacheH.nodeCache.set(cacheKey, result, cacheH.calculateTTL());
		return result;
	}
	catch(err){
		logger.error(`getQueryFromId: Query not found with field=${field} id=${id} org_id=${org_id}. ${err.message}`);
		return '';
	}
}

exports.opendoc = async(req, res, next) => {
	//update doc history and return OPS Link
	db._updatehistory(req.auth.payload.sub, req.query.doc_num, req.query.familyid, status.indexOf("viewed"), (err) => {
		if (err){
			logger.error(`opendoc: ${msgServerError}: ${err}`);
			return res.status(500).json({message: `opendoc: ${msgServerError}`});
		}else{
			//retrieve link to firstpageClipping
			const opslink = opsQuaestio.getLinkFromDocId(req.query.doc_num);
			opsQuaestio.getImagesLinksFromDocId((req.query.doc_num), (imagesLinks, cache) => {
				res.locals.cache = cache;
				res.locals.status = 200
				res.locals.body = {ops_link: opslink, images_links: imagesLinks ? imagesLinks : ""}
				return next();
			})
		}
	})
}

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









/*
const search = async (req, res, next) => {
  try {
    const reqQuery = await buildQuery(req.query, req.auth.userInfo.pattodate_org_id);
    
    if (!reqQuery) {
      logger.warn('search: The query for OPS is empty: nothing to search.');
      return res.status(200).send({});
    }
    
    logger.debug(reqQuery);
    
    const { body, cache } = await new Promise((resolve, reject) => {
      opsQuaestio.publishedDataSearch(reqQuery, (err, body, cache) => {
        if (err) reject(err);
        else resolve({ body, cache });
      });
    });

    const history = await getHistory(req.auth.payload.sub);

    const processedBody = processBody(body, history);

    res.locals.cache = cache;
    res.locals.status = 200;
    res.locals.body = processedBody;
    next();
  } catch (err) {
    handleError(err, res);
  }
};

const getHistory = async (userId) => {
  return new Promise((resolve, reject) => {
    db._gethistory(userId, (err, history) => {
      if (err) reject(err);
      else resolve(history);
    });
  });
};

const processBody = (body, history) => {
  return body.map(doc => {
    if (history) {
      const f = history.find(hdoc => hdoc.docid === doc.doc_num);
      doc.read_history = f?.status ? status[f.status] : status[0];
      doc.bookmark = f?.bookmark ? f.bookmark : false;
      doc.notes = f?.notes ? f.notes : "";
      doc.bmfolderid = f?.bmfolderid ? f.bmfolderid : "";
    }
    return doc;
  }).sort((a, b) => b.date - a.date);
};

const handleError = (err, res) => {
  let error = {
    status: null,
    message: ''
  };

  if (err?.response?.status === 403 && err?.response?.data) {
    error.status = 503;
    const OPSError = utils.parseOPSErrorXML(err.response.data);
    if (OPSError.isOPSError) {
      error.message = {
        "OPS_HTTP_STATUS": 403,
        "OPS_CODE": OPSError.code,
        "OPS_MESSAGE": OPSError.message
      };
    } else {
      error.message = {
        "HTTP_STATUS": 403,
        "MESSAGE": err.message
      };
    }
  } else {
    error.status = 500;
    error.message = err.message;
  }

  logger.error(`publishedDataSearch: Status: ${error.status}. Message: ${JSON.stringify(error.message)}`);
  res.status(error.status).json({ message: error.message });
};
*/