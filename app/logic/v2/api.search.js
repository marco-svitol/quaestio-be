const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const utils=require('../../utils');

exports.search = async(req, res) => {
	//validate params middleware??
	reqQuery="";
	if (req.query.pa){
		//Applicants and tecareas MUST not be passed as User input or they will be exposed to SQL injection
		reqQuery+=`(${await getQueryFromId("applicants", req.query.pa, req.auth.payload.sub)}) AND `
	};
	if (req.query.tecarea){
		reqQuery+=`(${await getQueryFromId("tecareas", req.query.tecarea, req.auth.payload.sub)}) AND `
		};
	if (req.query.txt){
		reqQuery+=`(txt=${req.query.txt}) AND `
		};
	if (req.query.pdfrom){
		reqQuery+=utils.validateDate(req.query.pdfrom, req.query.pdto);
	}
	
	reqQuery = reqQuery.slice(0,-5); //remove the last AND
	//reqQuery+=setRange(req.query.beginRange, getResultPerPage());
	if (!reqQuery) {
		logger.warn('search: The query for OPS is empty: nothing to search.');
		return res.status(200).send({});
	}
	logger.debug(reqQuery);
	opsQuaestio.publishedDataSearch(reqQuery, (err, body, headers, resultsinfo) => {
		if (!err) {
			logger.debug(`search: docsNum=${body.length}`);
			db._gethistory(req.auth.payload.sub, (err, history) => { 
				if (!err){
					const histBody = body.map(doc => {
						if (history){
							const f = history.find(hdoc =>  hdoc.docid === doc.doc_num);
							doc.read_history = f?status[f.status]:status[0];
							doc.bookmark = f?f.bookmark:false;
						} 
						return doc;
					})
					body = histBody.sort((a,b) => b.date - a.date);
					const userinfo = headers[0]?this.parseOPSQuota(headers[0]):this.parseOPSQuota(headers);
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

async function getQueryFromId (field, id, uid){
	try{
		return await db._getQuery(field, id, uid);	}
	catch(err){
		logger.error(`getQueryFromId: Query not found with field=${field} id=${id} uid=${uid}. ${err.message}`);
		return '';
	}
}

exports.userprofile = async(req, res) => {
	//validate params middleware??
	db._userprofile(req.auth.payload.sub, (err, qresult) => {
		if(err){
			logger.error(`userprofile: ${qresult.message}: ${err}`);
			res.status(500).json({message: `userprofile: ${msgServerError}`});
		}else{
			res.status(200).json(qresult.userprofile);
		}
	})
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
					const userinfo = imagesLinks.headers[0]?this.parseOPSQuota(imagesLinks.headers[0]):this.parseOPSQuota(imagesLinks.headers);
					res.status(200).send({ops_link: opslink, images_links: imagesLinks.imagesLinks, userinfo: userinfo});
				}else{
					res.status(200).send({ops_link: opslink, images_links: "", userinfo: ""});
				}
				
			})
		}
	})
}


exports.bookmark = async(req, res) => {
	//update boookmark
	//add a middleware to check query params!
	const bookmark = parseInt(req.query.bookmark, 10) || 0;
	db._updatebookmark(req.auth.payload.sub, req.query.doc_num, bookmark, status.indexOf("new") ,(err) => {
		if (err){
			logger.error(`bookmark: ${msgServerError}: ${err}`);
			res.status(500).json({message: `bookmark: ${msgServerError}`});
		}else{
			res.status(200).send();
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
			logger.error(`firstpageClipping: ${err.message}. Stack: ${err.stack}`)
			res.status(500).send(msgServerError+" : "+err.message)
		}
	})
} 

exports.parseOPSQuota = function(headers){
	let throttling = headers["x-throttling-control"].replace(',','').replace('(','').replace(')','').split(' ');
	throttling = throttling.map(x => {return x.split('=')});
	let quotas = ({"throttling-control": throttling, "individualquotaperhour-used": headers["x-individualquotaperhour-used"], "registeredquotaperweek-used": headers["x-registeredquotaperweek-used"]});
	return quotas;
}