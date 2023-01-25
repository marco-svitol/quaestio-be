const http = require('http');

module.exports = function(app, next) {
  return http.createServer(app)
  .listen(global.config_data.app.serverPort, () => {
    next();
  });
}
