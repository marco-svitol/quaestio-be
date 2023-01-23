//const { stream } = require('../logger');
const logger=require('../../logger'); 
const msgServerError = 'Server error';
const opsQuaestio = require("../../consts").opsQuaestio;

exports.search = async(req, res) => {
	logger.srvconsoledir(req, start=0);
	//validate params middleware??
	reqQuery="";
	if (req.query.ti){reqQuery+=`ti=${req.query.ti} AND `}
	//if (req.query.tecarea){reqQuery+=`cpc=${req.query.tecarea} AND `}
	//if (req.query.pubnum){reqQuery+=`pn=${req.query.pubnum} AND `}
	if (req.query.txt){reqQuery+=`txt=${req.query.txt} AND `}
	if (req.query.pdfrom){reqQuery+=`pd within "${req.query.pdfrom} ${req.query.pdto}" AND `}
	//if (req.query.pa){reqQuery+=`pa=${req.query.applicant} AND `}
	reqQuery=reqQuery.slice(0,-5);
	logger.debug(reqQuery);
	opsQuaestio.publishedDataSearch(reqQuery, (err,body) => {
		if (!err) {
			res.status(200).send(body);
		}else{
			logger.error(err)
			res.status(500)
		}
		
	})
	 
}