const logger=require('../logger'); 
const cache = require('memory-cache');
let memCache = new cache.Cache();  //Cache managment
const cacheEnabled = global.config_data.app.cacheEnabled  //en/dis global caching
const cacheTTLHours = global.config_data.app.cacheTTLHours //Cache persistance
const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

module.exports.cacheMiddleware = function(req, res, next){ //Function used by Router to manage cache
	let key =  '__express__' + (req.originalUrl || req.url) + JSON.stringify(req.body)
	let cacheContent = memCache.get(key);
	if(cacheContent){
		res.setHeader('Access-Control-Allow-Origin', '*')
		res.setHeader('Content-Type', 'application/json')
		res.send( cacheContent );
		logger.info(`Cache hit with key ${String(key)}.`);//Response in ${perfy.end(rTracer.id())['time']} secs`)
		return
	}else{
		res.sendResponse = res.send;
		res.send = (body) => { //put in cache only if ther's no error in body
			if (res.statusCode < 300 && cacheEnabled){
				memCache.put(key,body,cacheTTLHours*(3600*1000))
				logger.info(`Caching content with key ${String(key)} duration ${cacheTTLHours} hrs ; n. of CachedKeys: ${String(memCache.memsize())} ; CachedMemorySize ${niceBytes(memCache.exportJson().length)}`);
			}
			res.sendResponse(body);
		}
		next();
	}
}

module.exports.cacheMiddlewareReset = function() {
	logger.debug(`Cache had ${String(memCache.memsize())} CachedKeys and was ${niceBytes(memCache.exportJson().length)}.`);
	memCache.clear();
	logger.debug(`Cache is now ${niceBytes(memCache.exportJson().length)}.`);
}

function niceBytes(x){ //include a decimal point and a tenths-place digit if presenting less than ten of KB or greater units
	let l = 0, n = parseInt(x, 10) || 0;
	while(n >= 1024 && ++l)
		n = n/1024;
	return(`${n.toFixed(n < 10 && l > 0 ? 1 : 0)} ${units[l]}`);
  }