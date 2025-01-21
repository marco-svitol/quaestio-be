const bot = require('node-schedule');
const logger=require('../logger'); 
const opsQuaestio = require("../consts").opsQuaestio;

bot.scheduleJob("30 3 * * *", function(){
  
  const reqQueryList = [
    "PA=SIEGENIA"
  ];

  const botInfo = {
    "pattodate_translationEnabled": true,
    "pattodate_translateAbstract": false
  }

  reqQueryList.forEach((reqQuery, index) => {
    setTimeout(() => {
      opsQuaestio.publishedDataSearch(reqQuery, botInfo, (err, body, cache) => {
        if (!err) {
          logger.info(`BOT publishedDataSearch: query: ${reqQuery} returned ${body.length} docs and the cache bit is ${cache}`);
        }else{
          logger.info(`BOT publishedDataSearch: query: ${reqQuery} returned err ${err} and the cache bit is ${cache}`);
        }
      });
    //TODO: set default value to 180000
    }, index * 180000); // 3 minutes interval
  });

  logger.debug(`BOT: next scheduled at ${this.nextInvocation()}`);
})