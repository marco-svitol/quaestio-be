const logger=require('../logger'); 
const opsQuaestio = require("../consts").opsQuaestio;
const opsDocHelper = require('./opsDocHelpers.js');
nodeCache = require("../consts/cache").cacheHandler.nodeCache;

module.exports.getFamilyIdFromDocIdMiddleware = async (req, res, next) => {
  // If request already contains familyId then skip
  if (req.query.familyid) {
    return next();
  }

  const docId = req.query.doc_num;
  if (!docId) {
    logger.error('Document ID is required');
    return res.status(400).send('Document ID is required');
  }

  try {
    const cacheKey = docId;
    // Check if docid exists in the cache
    let familyId = nodeCache.get(cacheKey);
    if (familyId == undefined) {
      familyId = await opsDocHelper.fetchFamilyIdFromDocId(opsQuaestio.commonAxiosInstance, docId);
      nodeCache.set(cacheKey, familyId, 0);
    }
    req.query.familyid = familyId;
    next();
  } catch (error) {
    logger.error(`Error fetching family ID: ${error}`);
    res.status(500).send('Error fetching family ID');
  }
};