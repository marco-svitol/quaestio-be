const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const parseOPSQuota = require("../v1/api.search").parseOPSQuota;

exports.search = async(req, res) => {
	//validate params middleware??
	reqQuery="";
	if (req.query.pa){
		//Applicants and tecareas MUST not be passed as User input or they will be exposed to SQL injection
		reqQuery+=`${await getQueryFromId("applicants", req.query.pa, req.query.uid)} AND `
	};
	if (req.query.tecarea){
		reqQuery+=`${await getQueryFromId("tecareas", req.query.tecarea, req.query.uid)} AND `
		};
	if (req.query.txt){
		reqQuery+=`txt=${req.query.txt} AND `
		};
	if (req.query.fromField){
		reqQuery+=validateDate(req.query.fromField, req.query.toField);
	}
	reqQuery = cleanQuery(reqQuery);
	if (!reqQuery) {
		logger.warn('search: The query for OPS is empty: nothing to search.');
		return res.status(200).send({});
	}
	logger.verbose(reqQuery);
	opsQuaestio.publishedDataSearch(reqQuery, (err, body, headers) => {
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
					body = histBody;
					const userinfo = headers[0]?parseOPSQuota(headers[0]):parseOPSQuota(headers);
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

function cleanQuery(reqQuery){
	//remove the last AND
	return reqQuery.slice(0,-5);
}

function validateDate(fromField, toField){
	var date_regex = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|1\d|2\d|3[01])$/;
	fromFieldValid = date_regex.test(fromField);
	toFieldValid = date_regex.test(toField);
	if (fromFieldValid && !toFieldValid){toField = fromField}
	else if (!fromFieldValid && toFieldValid){fromField = toField};
	if (fromFieldValid || toFieldValid){
		return `pd within "${fromField} ${toField}" AND `
	}
	return null
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
	db._userprofile_v2(req.query.uid, (err, qresult) => {
		if(err){
			logger.error(`userprofile: ${msgServerError}: ${err}`);
			res.status(500).json({message: `userprofile: ${msgServerError}`});
		}else{
			logger.verbose({Response: qresult.userprofile});
			res.status(200).json(qresult.userprofile);
		}
	})
}
