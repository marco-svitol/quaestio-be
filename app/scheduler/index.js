const bot = require('node-schedule');
const logger=require('../logger'); 
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
    "PA=(HILLMAN OR (MINUTE AND KEY))",
    "PA=ICONX",
    "PA=IKEYLESS",
    "PA=(KEYLESSRIDE OR (SECURED AND MOBILITY) OR ((EMMANUEL OR ENRIQUE) AND LOPEZ))",
    "PA=(WU AND (EAST OR GUOSHENG OR ((KUO OR GUO) AND (SHEN OR SHENG))))",
    "PA=(ALBAN PROX/DISTANCE<3 GIACOMO)",
    "PA=(AXALYS OR (ALMA PROX/DISTANCE<3 EXPANSION))",
    "PA=BIPLAXT",
    "PA=(COLOMBO PROX/DISTANCE<3 DESIGN)",
    "PA=(COTSWOLD PROX/DISTANCE<3 ARCH*)",
    "PA=(DEVENTER PROX/DISTANCE<3 PROFILE)",
    "PA=(D H MECHATRONIC)",
    "PA=ERRETI NOT PA=(ERRETI PROX/DISTANCE<3 FACTORY)",
    "PA=(FAPIM OR EUROINVEST OR (BELLANDI PROX/DISTANCE<3 PAOLO))",
    "PA=FERCO",
    "PA=(\"FR\" PROX/DISTANCE<3 ACCESSORIES*) OR PA=(\"F R\" PROX/DISTANCE<3 ACCESSORIES*) OR (PA=(RAGNI PROX/DISTANCE<3 FONDERIE) OR PA=(RAGNI PROX/DISTANCE<3 DANIELE))",
    "PA=(COMUNELLO prox/DISTANCE<3 FRATELLI) OR PA=(COMUNELLO prox/DISTANCE<3 FLLI)",
    "PA=((GRETSCH PROX/DISTANCE<3 UNITAS) OR (BKS PROX/DISTANCE<3 GmbH))",
    "PA=(GUANGDONG prox/DISTANCE<3 AURICAN) OR PA=(GUANGDONG prox/DISTANCE<3 HARDWARE)",
    "PA=(HARDWARE prox/DISTANCE<3 KIN) OR PA=(GUANDONG prox/DISTANCE<3 KIN) OR PA=(HARDWARE prox/DISTANCE<3 KINLONG) OR PA=(GUANDONG prox/DISTANCE<3 KINLONG)",
    "PA=(((DR PROX/DISTANCE<3 HAHN) OR (HAHN AND GMBH AND DR)) NOT (HAHN PROX/DISTANCE<3 CARL))",
    "PA=HAUTAU",
    "PA=(HOPPE prox/distance<3 HOLDING) OR PA=(HOPPE prox/distance<3 AG)",
    "PA=LAVAAL",
    "PA=(LA PROX/DISTANCE<3 CROISEE)",
    "PA=(ASSA PROX/DISTANCE<3 ABLOY)",
    "PA=((MACO PROX/DISTANCE<3 TECH*) OR (MAICO PROX/DISTANCE<3 SRL))",
    "PA=(\"MASTER\" prox/distance<3 \"ITALY\") OR pa = MASTERLAB OR PA=(\"LACATENA\" PROX/DISTANCE<3 \"MARIA*\") OR PA=(LACATENA PROX/DISTANCE<3 LUIGIA) OR PA=(LOPERFIDO PROX/DISTANCE<3 MICHELE)",
    "PA=(MEDAL PROX/DISTANCE<3 SRL)",
    "PA=(\"TARTAGLIA\" prox/distance<3 \"NAZARIO\") OR pa=(\"TARTAGLIA\" prox/distance<3 \"MASSIMO\") OR pa=(\"TARTAGLIA\" prox/distance<3 \"ROCCO\") OR pa = \"METALKARD\" OR pa = \"METRALKARD\"",
    "PA=NEKOS NOT PA=(NEKOS PROX/DISTANCE<3 OY)",
    "PA=(PBA PROX/DISTANCE<3 SPA)",
    "PA=(\"PRIMO\" (\"PROFILE*\" OR \"INTER\" OR \"FINLAND\" OR \"NETHERLANDS\" OR \"SVERIGE\" OR \"NORGE\")) OR PA=(\"PROFILEX\" \"PLASTIC\")",
    "PA=(ROTO PROX/DISTANCE<3 FRANK)",
    "PA=(SAVIO PROX/DISTANCE<3 SPA)",
    "PA=(SCHUCO PROX/DISTANCE<3 INT*) OR PA=(SCHUECO PROX/DISTANCE<3 INT*)",
    "PA=SECURISTYLE",
    "pa = \"SIEGENIA\" OR (pa=(\"KFV\" prox/distance<3 \"KARL\") AND pa=(\"KFV\" prox/distance<3 \"FLIETHER\"))",
    "PA=SIMONSWERK OR (PA=(ANSELMI PROX/DISTANCE<3 C) OR PA=(ANSELMI PROX/DISTANCE<3 SRL)) OR PA=(COLCOM PROX/DISTANCE<3 GROUP) OR PA=SADEV",
    "PA=(\"SIST*\" prox/distance<3 \"TECNICOS\") AND (pa=(\"SIST*\" prox/distance<3 \"ACCESORIO\") OR pa=(\"SIST*\" prox/distance<3 \"COMPONENTES\"))",
    "PA=TECSEAL",
    "PA=(TOPP PROX/DISTANCE<3 SRL)",
    "PA=(TRELLEBORG PROX/DISTANCE<3 SEALING)",
    "PA=SCHLECHTENDAHL PROX/DISTANCE<3 SOEHNE OR PA=SCHLECHTENDAHL PROX/DISTANCE<3 WILH"
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