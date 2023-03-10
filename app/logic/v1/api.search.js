const logger=require('../../logger'); 
const msgServerError = 'Internal server error';
const opsQuaestio = require("../../consts").opsQuaestio;
// const XMLValidator = require('fast-xml-parser').XMLValidator;
// const XMLParser = require('fast-xml-parser').XMLParser;
// const parser = new XMLParser();

exports.search = async(req, res) => {
	//validate params middleware??
	reqQuery="";
	if (req.query.ti){reqQuery+=`ti=${req.query.ti} AND `}
	//if (req.query.tecarea){reqQuery+=`cpc=${req.query.tecarea} AND `}
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
	//if (req.query.pa){reqQuery+=`pa=${req.query.applicant} AND `}
	reqQuery=reqQuery.slice(0,-5);
	logger.verbose(`Parameters: ${reqQuery}`);
	opsQuaestio.publishedDataSearch(reqQuery, (err,body, headers) => {
		if (!err) {
			logger.debug(`Headers: ${headers}`);
			res.status(200).json(body);
			// const result = XMLValidator.validate(body);
			// if (result === true){
			// 	logger.verbose("XML validation passed.")
			// 	const jsonbody = parser.parse(body);
			// 	res.status(200).send(jsonbody);
			// }else{
			// 	logger.debug(`XML invalid. ${body}`)
			// 	res.status(500).send("XML invalid.")
			// }
		}else{
			logger.error(`publishedDataSearch: ${err.message}. Stack: ${err.stack}`)
			res.status(500).send(msgServerError+" : "+err.message)
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