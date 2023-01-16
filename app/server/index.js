const http = require('http');

module.exports = function(app, next) {
  return http.createServer(app)
  .listen(process.env.SERVERPORT, () => {
    next();
  });
}
