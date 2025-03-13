const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const utils=require('../../utils');
const cacheH = require("../../consts/cache").cacheHandler;

// This searchWrapper function is a wrapper of search
// It first validates the query parameters and then calls the search function
// The parameters validation are:
// - doc_num: it can be empty and only chars a-z, A-Z, 0-9, - and . are allowed
// - pa: it cannot be empty and should be an integer
// - tecarea: it can be empty and should be an integer
// - pdfrom: it can be empty and should be a date in the format yyyy-mm-dd
// - pdto: it can be empty and should be a date in the format yyyy-mm-dd
// If the query parameters are not valid, it returns a 400 status code with a message
// If the query parameters are valid, it calls the search function
// It calls the search function once or multiple times depending on the value of query.doc_num and query.pa
// If query.doc_num is a string and not empty, it calls search once with the value of query.doc_num
// If query.pa is a string, not empty and equal to an integer that is divisible by 1009,
// then if query.tecarea is not empty,
// it calls search iteratively on query.pa from value 1 up to the value of query.pa divided by 1009
// and all the other values of query.tecarea, query.pdfrom and query.pdto
// if query.tecarea is empty, then return empty
// If query.pa is a string, not empty and not divisible by 1009,
// it calls search once with the values of query.pa, query.tecarea, query.pdfrom and query.pdto
exports.searchWrapper = async (req, res, next) => {
	const { doc_num, pa, tecarea, pdfrom, pdto } = req.query;

	logger.info('searchWrapper: Received query parameters', { doc_num, pa, tecarea, pdfrom, pdto });

	// Validate doc_num
	if (doc_num && !/^[a-zA-Z0-9-.]+$/.test(doc_num)) {
		logger.error('searchWrapper: Invalid doc_num format');
		return res.status(400).json({ message: 'Invalid doc_num format' });
	}

	// Validate pa
	if (!pa || !Number.isInteger(Number(pa)) || Number(pa) <= 0) {
		logger.error('searchWrapper: Invalid or missing pa format');
		return res.status(400).json({ message: 'Invalid or missing pa format' });
	}

	// Validate tecarea
	if (tecarea && (!Number.isInteger(Number(tecarea)) || Number(tecarea) <= 0)) {
		logger.error('searchWrapper: Invalid tecarea format');
		return res.status(400).json({ message: 'Invalid tecarea format' });
	}

	// Validate pdfrom and pdto
	const dateRegex = /^\d{4}\d{2}\d{2}$/;
	if ((pdfrom && !dateRegex.test(pdfrom)) || (pdto && !dateRegex.test(pdto))) {
		logger.error('searchWrapper: Invalid date format');
		return res.status(400).json({ message: 'Invalid date format' });
	}

	logger.info('searchWrapper: Query parameters validated successfully');

	// Call search function based on the query parameters
	if (doc_num) {
		logger.info('searchWrapper: Calling search with doc_num');
		reqQuery = `pn=${doc_num}`;
		if (await search(reqQuery, req.auth, res)){
		}else{
			logger.error(`searchWrapper: Error ${res.locals.status}. ${res.locals.body.message}`);
			res.locals.body = {};
		}
	}else if (Number(pa) % 1009 === 0) {
		if (tecarea) {
			logger.info('searchWrapper: Iteratively calling search with pa and tecarea');
			let finalResult = [];
			for (let i = 1; i <= Number(pa) / 1009; i++) {
				req.query.pa = i.toString();
				logger.debug(`searchWrapper: Iteration ${i} with pa=${req.query.pa}`);
				const reqQuery = await buildQuery(req.query, req.auth.userInfo.pattodate_org_id);
				if (await search(reqQuery, req.auth, res)){
					finalResult = finalResult.concat(res.locals.body);
				}else{
					logger.error(`searchWrapper: Error ${res.locals.status}. ${res.locals.body.message}`);
					res.locals.body = {};
				}
			}
			res.locals.body = finalResult;
		} else {
			logger.info('searchWrapper: tecarea is empty, returning empty response');
			res.locals.status = 200;
			res.locals.body = [];
		}
	} else {
		logger.info('searchWrapper: Calling search with pa');
		const reqQuery = await buildQuery(req.query, req.auth.userInfo.pattodate_org_id);
		if (!(await search(reqQuery, req.auth, res))){
			logger.error(`searchWrapper: Error ${res.locals.status}. ${res.locals.body.message}`);
			res.locals.body = {};
		}
	}
	return next();
};

async function search(reqQuery, auth, res) {
	logger.debug(reqQuery);

	try {
			const body = await new Promise((resolve, reject) => {
					opsQuaestio.publishedDataSearch(reqQuery, auth.userInfo, (err, body, cacheHit) => {
							if (err) {
									reject(err);
							} else {
									resolve({ body, cacheHit });
							}
					});
			});

			const { body: searchBody, cacheHit } = body;

			const history = await new Promise((resolve, reject) => {
					db._gethistory(auth.payload.sub, (err, familyhistory, dochistory) => {
							if (err) {
									reject(err);
							} else {
									resolve({ familyhistory, dochistory });
							}
					});
			});

			const { familyhistory, dochistory } = history;

			const histBody = searchBody.map(doc => {
					let f = null;
					let d = null;
					if (familyhistory) {
							f = familyhistory.find(hdoc => hdoc.familyid == doc.familyid);
					}
					if (dochistory) {
							d = dochistory.find(hdoc => hdoc.docid === doc.doc_num);
					}
					doc.read_history = f?.status ? status[f.status] : status[0];
					doc.bookmark = d?.bookmark ? d.bookmark : false;
					doc.notes = f?.notes ? f.notes : "";
					doc.bmfolderid = d?.bmfolderid ? d.bmfolderid : "";
					return doc;
			});

			const sortedBody = histBody.sort((a, b) => b.date - a.date);

			res.locals.cacheHit = res.locals.cacheHit || cacheHit;
			res.locals.status = 200;
			res.locals.body = sortedBody;
			return true;
	} catch (err) {
			logger.error(`search: ${err.message}. Stack: ${err.stack}`);
			res.locals.cacheHit = false;
			res.locals.status = err.status || 500;
			res.locals.body = { message: `search: ${msgServerError}` };
			return false;
	}
}

async function buildQuery(query, orgId) {
  let reqQuery = "";
  
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

exports.opendoc = async (req, res, next) => {
	try {
		// TODO: A day will come when we will be asked to re-enable this: set a document to "viewed" when is opened
		// await new Promise((resolve, reject) => {
		// 	db._docStatus(req.auth.payload.sub, req.query.familyid, status.indexOf("viewed"), (err) => {
		// 	//db._updatehistory(req.auth.payload.sub, req.query.doc_num, req.query.familyid, status.indexOf("viewed"), (err) => {
		// 		if (err) {
		// 			logger.error(`opendoc: ${msgServerError}: ${err}`);
		// 			reject(err);
		// 		} else {
		// 			resolve();
		// 		}
		// 	});
		// });

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
