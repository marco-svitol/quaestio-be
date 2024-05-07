// Define the middleware function to set custom headers
exports.setCustomHeaders = function (req, res, next) {
  if (res.locals.cache === 'hit'){
    res.setHeader('X-Cache', 'hit');
  }
  return next();
}

exports.sendRes = function(req, res){
  //Prevent FE to crash if no userinfo
  if (res.locals.body.length === 0){
    res.locals.body = ([{userinfo: {}}]);
  }
  res.status(res.locals.status).json(res.locals.body);
}
