const logger=require('../../logger'); 
cacheH = require("../../consts/cache").cacheHandler;
const msgServerError=require('../../consts').msgServerError; 

exports.cacheReset = async (req, res) => {
	try {
        cacheH.cacheReset()
        logger.debug(`cacheReset: ok`);
        return res.status(200).json({message: "Cache cleared"});
    }catch(err){
        logger.error(`cacheReset: error. ${err} `);
        return res.status(500).json({message: msgServerError});
    }
}

exports.cacheStats = async (req, res) => {
	try{
        const stats = cacheH.cacheStats()
        logger.debug(`cacheStats: ok. Stats: ${JSON.stringify(stats)}`);
        return res.status(200).json({stats: stats});
    }catch(err){
        logger.error(`cacheStats: error. ${err} `);
        return res.status(500).json({message: msgServerError});
    }
}

exports.cacheKeys = async (req, res) => {
	try{
        const keys = cacheH.cacheKeys()
        logger.debug(`cacheKeys: ok. Keys: ${JSON.stringify(keys)}`);
        return res.status(200).json({keys: keys});
    }catch(err){
        logger.error(`cacheKeys: error. ${err} `);
        return res.status(500).json({message: msgServerError});
    }
}

exports.dumpTranslatorCache = async (req, res) => {
    try{
        dumpedKeysNum = cacheH.dumpTranslatorCache()
        logger.debug(`dumpTranslatorCache: dumped ${dumpedKeysNum} keys`);
        return res.status(200).json({message: "Cache dumped"});
    }catch(err){
        logger.error(`dumpTranslatorCache: error. ${err} `);
        return res.status(500).json({message: msgServerError});
    }
}
