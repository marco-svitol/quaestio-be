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
if (process.env.NODE_ENV == 'development'){
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



module.exports=logger;

module.exports.srvconsoledir = function (request, start=1, err = 0){ //internal: log service call info to console
	let srvname = request.path;
  if (err==0){
		if (start){
			let params = JSON.stringify(request.body)
			if (srvname == '/health' || srvname == '/metrics'){return;}  //do not print health service to prevent logs flood! 
			this.info(`${srvname} service request from ${request.connection.remoteAddress} : ${params}`)
      perfy.start(rTracer.id());
		}else{
      let perfSecs = perfy.end(rTracer.id())['time'];
      let perfMsg = `${perfSecs} secs`
      this.info(`${srvname} service completed for ${request.hostname} in ${perfMsg}`)
    }
  }else{
		this.error(`${srvname} service requested from ${request.hostname} raised this error: ${err}`)
		perfy.end(rTracer.id());
	}
}