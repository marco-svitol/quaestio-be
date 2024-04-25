const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];

exports.bookmark = async (req, res) => {
	//const bookmark = parseInt(req.query.bookmark, 10) || 0;
	const bmfolderid = req.query.bookmark === '0' ? null : req.query.bookmark;

	let docmetadata = '';

	if (bmfolderid != null) {
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

	db._updatebookmark(req.auth.payload.sub, req.query.doc_num, bmfolderid, status.indexOf("new"), docmetadata, (err) => {
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

    db._updatebmfolder(req.auth.payload.sub, bmfolderid, bmfoldername, (err, actionTaken) => {
        if (err) {
            logger.error(`notes: ${msgServerError}: ${err}`);
            return res.status(500).json({ message: `bmfolder: ${msgServerError}` });
        } else {
            return res.status(200).json({ action: actionTaken });
        }
    });
}