const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const utils=require('../../utils');

exports.search = async(req, res) => {
	//validate params middleware??
	reqQuery="";
	if (typeof req.query.doc_num === "string" && req.query.doc_num.trim() !== "") {
		reqQuery = `pn=${req.query.doc_num}`;
	} else {
		const conditions = [];
		if (req.query.pa) {
			conditions.push(await getQueryFromId("applicants", req.query.pa, req.auth.userInfo.pattodate_org_id));
		}

		if (req.query.tecarea) {
			conditions.push(`(${await getQueryFromId("tecareas", req.query.tecarea, req.auth.userInfo.pattodate_org_id)})`);
		}

		if (req.query.pdfrom) {
			conditions.push(utils.validateDate(req.query.pdfrom, req.query.pdto));
		}

		if (conditions.length > 0) {
			reqQuery = conditions.join(" AND ");
		}
	}

	if (!reqQuery) {
		logger.warn('search: The query for OPS is empty: nothing to search.');
		return res.status(200).send({});
	}
	logger.debug(reqQuery);
	opsQuaestio.publishedDataSearch(reqQuery, (err, body, headers, resultsinfo) => {
		if (!err) {
			logger.debug(`publishedDataSearch: total filtered and grouped by family: ${body.length}`);
			db._gethistory(req.auth.payload.sub, (err, history) => { 
				if (!err){
					const histBody = body.map(doc => {
						if (history){
							const f = history.find(hdoc =>  hdoc.docid === doc.doc_num);
							doc.read_history = f?.status?status[f.status]:status[0];
							doc.bookmark = f?.bookmark?f.bookmark:false;
							doc.notes = f?.notes?f.notes:"";
							doc.bmfolderid = f?.bmfolderid?f.bmfolderid:"";
						} 
						return doc;
					})
					body = histBody.sort((a,b) => b.date - a.date);
					const userinfo = headers[0]?utils.parseOPSQuota(headers[0]):utils.parseOPSQuota(headers);
					body.push({userinfo: userinfo});
					return res.status(200).send(body);
				}else{
					logger.error(`publishedDataSearch:gethistory ${err.message}`);
					return res.status(500).json({message: `search: ${msgServerError}`});
				}
			})
		}else{
			let error = {
						status : null,
						message : ''
						};
			if (err?.response?.status === 403 && err?.response?.data){
				// 403 is returned from OPS, but it doesn't make much sense to send it as is to the fe
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
			}
			logger.error(`publishedDataSearch: Status: ${error.status}. Message: ${JSON.stringify(error.message)}`);
			return res.status(error.status).json({message: error.message});
		}
	})
}

async function getQueryFromId (field, id, org_id){
	try{
		return await db._getQuery(field, id, org_id);	}
	catch(err){
		logger.error(`getQueryFromId: Query not found with field=${field} id=${id} org_id=${org_id}. ${err.message}`);
		return '';
	}
}

exports.opendoc = async(req, res) => {
	//update doc history and return OPS Link
	db._updatehistory(req.auth.payload.sub, req.query.doc_num, status.indexOf("viewed"), (err) => {
		if (err){
			logger.error(`opendoc: ${msgServerError}: ${err}`);
			return res.status(500).json({message: `opendoc: ${msgServerError}`});
		}else{
			//retrieve link to firstpageClipping
			const opslink = opsQuaestio.getLinkFromDocId(req.query.doc_num);
			opsQuaestio.getImagesLinksFromDocId((req.query.doc_num), (imagesLinks) => {
				if (imagesLinks){
					const userinfo = imagesLinks.headers[0]?utils.parseOPSQuota(imagesLinks.headers[0]):utils.parseOPSQuota(imagesLinks.headers);
					return res.status(200).send({ops_link: opslink, images_links: imagesLinks.imagesLinks, userinfo: userinfo});
				}else{
					return res.status(200).send({ops_link: opslink, images_links: "", userinfo: ""});
				}
				
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