const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const opsQuaestio = require("../../consts").opsQuaestio;
const db=require('../../database');
const status = ["new", "listed", "viewed"];

exports.bookmark = async (req, res) => {
	const bookmark = parseInt(req.query.bookmark, 10) || 0;
	let docmetadata = '';

	if (bookmark == 1) {
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

	db._updatebookmark(req.auth.payload.sub, req.query.doc_num, bookmark, status.indexOf("new"), docmetadata, (err) => {
		if (err) {
		logger.error(`bookmark: ${msgServerError}: ${err}`);
		res.status(500).json({ message: `bookmark: ${msgServerError}` });
		} else {
		const booleanResult = !!bookmark;
		res.status(200).json({ bookmark: booleanResult });
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
            res.status(200).json(results);
        }else{
			logger.error(`searchbookmark: ${err}`)
			res.status(500).json({message: `searchbookmark: ${msgServerError}`});
        }
    })
}