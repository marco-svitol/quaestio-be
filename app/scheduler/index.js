const bot = require('node-schedule');
const logger=require('../logger'); 
const { forEach } = require('lodash');
const opsQuaestio = require("../consts").opsQuaestio;

bot.scheduleJob("30 3 * * *", function(){
  
  const reqQueryList = [
    "PA=SIEGENIA",
    "PA=GEZE",
    "PA=ROTO FRANK",
    "PA=SOTRALU",
    "PA=FERCO NOT PA=(ARCH OR HARDWARE OR TONEY OR DEV OR COM OR SEATING OR SOCIO)",
    "PA=(DORMAKABA OR DORMA OR KABA OR ILCO)",
    "PA=SILCA",
    "PA=(ADVANCED AND DIAGNOSTICS)",
    "PA=(JMA OR (ALEJANDRO AND ALTUNA))",
    "PA=XHORSE",
    "PA=(HILLMAN or (MINUTE AND KEY))",
    "PA=ICONX",
    "PA=IKEYLESS",
    "PA=(KEYLESSRIDE OR (SECURED AND MOBILITY) OR ((EMMANUEL OR ENRIQUE) AND LOPEZ))",
    "PA=(WU AND (EAST OR GUOSHENG OR ((KUO OR GUO) AND (SHEN OR SHENG))))"
  ];

  reqQueryList.forEach((reqQuery, index) => {
    setTimeout(() => {
      opsQuaestio.publishedDataSearch(reqQuery, (err, body, cache) => {
        if (!err) {
          logger.info(`BOT publishedDataSearch: query: ${reqQuery} returned ${body.length}  bytes and the cache bit is ${cache}`);
        }else{
          logger.info(`BOT publishedDataSearch: query: ${reqQuery} returned err ${err} and the cache bit is ${cache}`);
        }
      });
    }, index * 180000); // 3 minutes interval
  });

  logger.debug(`BOT: next scheduled at ${this.nextInvocation()}`);
})