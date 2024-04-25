const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const db=require('../../database');
const status = ["new", "listed", "viewed"];

exports.notes = async (req, res) => {
    const notes = req.query.notes ? req.query.notes : "";
    db._updatenotes(req.auth.payload.sub, req.query.doc_num, notes, status.indexOf("new"), (err) => {
        if (err) {
            logger.error(`notes: ${msgServerError}: ${err}`);
            return res.status(500).json({ message: `notes: ${msgServerError}` });
        } else {
            return res.status(200).send();
        }
    });
}