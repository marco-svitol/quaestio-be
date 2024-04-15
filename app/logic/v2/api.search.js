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
							doc.read_history = f?status[f.status]:status[0];
							doc.bookmark = f?f.bookmark:false;
							doc.notes = f?f.notes:"";
						} 
						return doc;
					})
					body = histBody.sort((a,b) => b.date - a.date);
					const userinfo = headers[0]?utils.parseOPSQuota(headers[0]):utils.parseOPSQuota(headers);
					body.push({userinfo: userinfo});
					res.status(200).send(body);
				}else{
					logger.error(`publishedDataSearch:gethistory ${err.message}. Stack: ${err.stack}`);
					res.status(500).json({message: `search: ${msgServerError}`});
				}
			})
		}else{
			logger.error(`publishedDataSearch: ${err.message}. Stack: ${err.stack}`);
			res.status(500).json({message: `search: ${msgServerError}`});
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
			res.status(500).json({message: `opendoc: ${msgServerError}`});
		}else{
			//retrieve link to firstpageClipping
			const opslink = opsQuaestio.getLinkFromDocId(req.query.doc_num);
			opsQuaestio.getImagesLinksFromDocId((req.query.doc_num), (imagesLinks) => {
				if (imagesLinks){
					const userinfo = imagesLinks.headers[0]?utils.parseOPSQuota(imagesLinks.headers[0]):utils.parseOPSQuota(imagesLinks.headers);
					res.status(200).send({ops_link: opslink, images_links: imagesLinks.imagesLinks, userinfo: userinfo});
				}else{
					res.status(200).send({ops_link: opslink, images_links: "", userinfo: ""});
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
			res.status(500).json({message: `firstpageClipping: ${msgServerError}`});
		}
	})
} 