const logger=require('../logger'); 

// Define the middleware function to set custom headers
exports.setCustomHeaders = function (req, res, next) {
  if (res.locals.cache === 'hit'){
    logger.verbose('setCustomHeaders: cache hit');
    res.setHeader('X-Cache', 'hit');
  }
  return next();
}

exports.sendRes = function(req, res){
  res.status(res.locals.status).json(res.locals.body);
}
