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
    "PA=FERCO",
    "PA=Dormakaba Group",
    "PA=Silca",
    "PA=Advanced Diagnostics",
    "PA=JMA Altuna Group",
    "PA=Shenzhen Xhorse Electronics",
    "PA=Hillman Group/Minute Key",
    "PA=Iconx/MyKey",
    "PA=iKeyless / Car Keys Express",
    "PA=Keylessride",
    "PA=East of Wu / Wu Kuo Shen"
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
    }, index * 120000); // 2 minutes interval
  });

  logger.debug(`BOT: next scheduled at ${this.nextInvocation()}`);
})