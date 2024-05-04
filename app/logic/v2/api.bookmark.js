const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const utils=require('../../utils');

exports.bookmark = async (req, res) => {
	let bookmark = 0;
	let bmfolderid = null; 
	let docmetadata = '';

	//Check if bmfolderid and then bookmark = 1
	if (utils.isCID(req.query.bookmark)){
		bmfolderid = req.query.bookmark;
		bookmark = 1;
		try {
		docmetadata = await new Promise((resolve, reject) => {
			opsQuaestio.publishedDataSearch(`pn=${req.query.doc_num}`, (err, body) => {
				if (!err) {
					resolve(JSON.stringify(body[0]));
				} else {
					logger.error(`bookmark: ${msgServerError}: ${err}`);
					res.status(500).json({ message: `bookmark: ${msgServerError}` });
					reject(err);
				}
			});
		});
		} catch (error) {
			logger.error(`bookmark: ${msgServerError}: ${err}`);
			return res.status(500).json({ message: `bookmark: ${msgServerError}` });
		}
	}

	db._updatebookmark(req.auth.payload.sub, req.query.doc_num, bookmark, bmfolderid, status.indexOf("new"), docmetadata, (err) => {
		if (err) {
		logger.error(`bookmark: ${msgServerError}: ${err}`);
		return res.status(500).json({ message: `bookmark: ${msgServerError}` });
		} else {
		const booleanResult = !!bmfolderid;
		return res.status(200).json({ bookmark: booleanResult });
		}
	});
};

exports.searchbookmark = async(req, res) => {
    db._getbookmarks(req.auth.payload.sub, req.query, (err, body) => {
        if (!err){
			let results = '{}';
			if (body){
				results = body.map(doc => {
					doc.read_history = status[doc.read_history];
					return doc;
				})
			}
            return res.status(200).json(results);
        }else{
			logger.error(`searchbookmark: ${err}`)
			return res.status(500).json({message: `searchbookmark: ${msgServerError}`});
        }
    })
}

exports.bmfolder = async (req, res) => {
    const bmfolderid = req.query.id ? req.query.id : "";
	const bmfoldername = req.query.name ? req.query.name : "";

    db._updatebmfolder(req.auth.payload.sub, bmfolderid, bmfoldername, (err, result) => {
        if (err) {
            if (err.status === 403){
				logger.error(`bmfolder: 403: ${err}`);
				return res.status(403).json(err.message)
			}else{
            	return res.status(500).json({ message: `bmfolder: ${msgServerError}` });
			}
		} else {
            return res.status(200).json({
				action: result.action,
				bmfolderid: result.bmfolderid
			});
        }
    });
}