const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
// const XMLValidator = require('fast-xml-parser').XMLValidator;
// const XMLParser = require('fast-xml-parser').XMLParser;
// const parser = new XMLParser();
const status = ["new", "listed", "viewed"];

exports.search = async(req, res) => {
	//validate params middleware??
	reqQuery="";
	if (req.query.pa){reqQuery+=`pa=${req.query.pa} AND `}
	if (req.query.tecarea){reqQuery+=`cpc=${req.query.tecarea} AND `}
	//if (req.query.pubnum){reqQuery+=`pn=${req.query.pubnum} AND `}
	if (req.query.txt){reqQuery+=`txt=${req.query.txt} AND `}
	if (req.query.pdfrom){
		var date_regex = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|1\d|2\d|3[01])$/;
		let pdFrom = req.query.pdfrom;
		let pdTo = req.query.pdto;
		pdFromValid = date_regex.test(pdFrom);
		pdToValid = date_regex.test(pdTo);
		if (pdFromValid && !pdToValid){pdTo = pdFrom}
		else if (!pdFromValid && pdToValid){pdFrom = pdTo};
		if (pdFromValid || pdToValid){reqQuery+=`pd within "${pdFrom} ${pdTo}" AND `}
	}
	//if (req.query.applicant){reqQuery+=`pa=${req.query.applicant} AND `}

	reqQuery=reqQuery.slice(0,-5);
	logger.verbose(`Parameters: ${reqQuery}`);
	opsQuaestio.publishedDataSearch(reqQuery, (err,body, headers) => {
		if (!err) {
			db._gethistory(req.query.uid, (err, history) => { 
				if (!err){
					const histBody = body.map(doc => {
						let f=0;
						if (history){
							f = history.find(hdoc =>  hdoc.docid === doc.doc_num);
							f = f?f.status:0;
						} 
						doc.read_history = status[f];
						return doc;
					})
					logger.debug(`Headers: ${headers}`);
					body = histBody;
					const userinfo = headers[0]?parseOPSQuota(headers[0]):parseOPSQuota(headers);
					body.push({userinfo: userinfo});
					res.status(200).send(body);
				}else{
					logger.error(`publishedDataSearch:gethistory ${err.message}. Stack: ${err.stack}`);
					res.status(500).json({message: `search: ${msgServerError}`});
				}

			// const result = XMLValidator.validate(body);
			// if (result === true){
			// 	logger.verbose("XML validation passed.")
			// 	const jsonbody = parser.parse(body);
			// 	res.status(200).send(jsonbody);
			// }else{
			// 	logger.debug(`XML invalid. ${body}`)
			// 	res.status(500).send("XML invalid.")
			// }
			})
		}else{
			logger.error(`publishedDataSearch: ${err.message}. Stack: ${err.stack}`);
			res.status(500).json({message: `search: ${msgServerError}`});
		}
		
	})
	 
}

exports.publication = async(req, res) => {
	//validate params middleware??
	reqQuery="";
	if (req.query.id){reqQuery+=`${req.query.id}`}
	logger.verbose(`Parameters: ${reqQuery}`);
	opsQuaestio.publishedDataPubblicationDocDB(reqQuery, (err,body, headers) => {
		if (!err) {
			logger.debug(`Headers: ${headers}`);
			res.status(200).send(body);
		}else{
			logger.error(`publication: ${err.message}. Stack: ${err.stack}`)
			res.status(500).send(msgServerError+" : "+err.message)
		}	
	})
}

exports.userprofile = async(req, res) => {
	//validate params middleware??
	db._userprofile(req.query.uid, (err, qresult) => {
		if(err){
			logger.error(`userprofile: ${msgServerError}: ${err}`);
			res.status(500).json({message: `userprofile: ${msgServerError}`});
		}else{
			res.status(200).json(qresult.userprofile);
		}
	})
}

exports.opendoc = async(req, res) => {
	//update doc history and return OPS Link
	db._updatehistory(req.query.uid, req.query.doc_num, status.indexOf("viewed"), (err, qresult) => {
		if (err){
			logger.error(`opendoc: ${msgServerError}: ${err}`);
			res.status(500).json({message: `opendoc: ${msgServerError}`});
		}else{
			opslink = opsQuaestio.getLinkFromDocId(req.query.doc_num);
			res.status(200).send({ops_link: opslink});
		}
	})
}

function parseOPSQuota(headers){
	let throttling = headers["x-throttling-control"].replace(',','').replace('(','').replace(')','').split(' ');
	throttling = throttling.map(x => {return x.split('=')});
	let quotas = ({"throttling-control": throttling, "individualquotaperhour-used": headers["x-individualquotaperhour-used"], "registeredquotaperweek-used": headers["x-registeredquotaperweek-used"]});
	return quotas;
}