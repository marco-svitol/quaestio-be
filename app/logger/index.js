const logdnaWinston = require('logdna-winston');
const logdnaOptions = {
  key: global.config_data.app.logdnakey,
  hostname: global.config_data.app.loghostname,
  app: 'Quaestio-BackEnd',
  env: global.config_data.app.logenv,
  level: global.config_data.app.loglevel, // Default to debug, maximum level of log, doc: https://github.com/winstonjs/winston#logging-levels
  indexMeta: true // Defaults to false, when true ensures meta object will be searchable
}

var winston = require('winston');
const format = require('winston').format;
const moment = require('moment-timezone');

const rTracer = require('cls-rtracer')
let perfy = require('perfy');

const appendTimestamp = format((info, opts) => {
  if(opts.tz)
    info.timestamp = moment().tz(opts.tz).format('DD-MM-YYYY HH:mm:ss:SSS').trim();
  return info;
});

const myCustomLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    verbose: 'magenta'
  }
};

winston.addColors(myCustomLevels.colors);

var console = null;
if (global.environment === 'development'){
  console = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true })
      ),
    level: global.config_data.app.loglevel
  })
}else{
  console = new winston.transports.Console({
    level: global.config_data.app.loglevel
  })
}

var logger = winston.createLogger({
  levels: myCustomLevels.levels,
  level: global.config_data.app.loglevel,
  format: winston.format.combine(
    appendTimestamp({ tz: 'Europe/Rome' }),
    winston.format.printf(log => {    
      if (rTracer.id() != null){
        rTrac = rTracer.id();
      }else{
        rTrac = `Main thread pid ${process.pid}`;
      }
      msg = `${rTrac} | ${log.timestamp.padEnd(23,' ')} | ${(''+log.level+'').padEnd(17, ' ')} | ${log.message}`;
      return msg;
    })
  ),
  transports: [
    console
  ]
});

logger.add(new logdnaWinston(logdnaOptions));


module.exports=logger;

module.exports.srvconsoledir = function (request, start=1, err = 0){ //internal: log service call info to console
  let srvname = request.path;
  if (err==0){
		if (start){
			if (srvname == '/health'  ||
          srvname == '/metrics' || 
          srvname == '/login'
          ){return;}  //do not print health service to prevent logs flood! 
			let msg;
      if (request.method === 'POST'){
        let params = JSON.stringify(request.body)
        msg=`POST ${srvname} request from ${request.connection.remoteAddress}. Body:${params}`;
      }else{
        msg=`GET request ${request.originalUrl} from ${request.connection.remoteAddress}`;
      }
      this.debug(msg);
      perfy.start(rTracer.id());
		}else{
      let perfSecs = perfy.end(rTracer.id())['time'];
      let perfMsg = `${perfSecs} secs`
      this.debug(`${srvname} service completed for ${request.hostname} in ${perfMsg}`)
    }
  }else{
		this.error(`${srvname} service requested from ${request.hostname} raised this error: ${err}`)
		perfy.end(rTracer.id());
	}
}