const logger=require('../logger'); 

// Define the middleware function to set custom headers
exports.setCustomHeaders = function (req, res, next) {
  if (res.locals.cacheHit){
    logger.verbose('setCustomHeaders: cache hit');
    res.setHeader('X-Cache', 'hit');
  }
  return next();
}

exports.sendRes = function(req, res){
  if (res.locals.status >= 400){
    return res.end();
  }
  res.status(res.locals.status).json(res.locals.body);
}
