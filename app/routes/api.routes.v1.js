module.exports = myapp => {
  var {unless}          = require('express-unless');
  const routerapp       = require("express").Router();
  //const routerappbeta   = require("express").Router();
  const routermetrics   = require("express").Router();
  const apitest         = require("../logic/v1/api.test");
  const apisearch       = require("../logic/v1/api.search")
  const apihealth       = require("../logic/health");
  const cacheMiddleware = require('../cache').cacheMiddleware;

  cacheMiddleware.unless = unless; 
  routerapp.use(cacheMiddleware.unless({
    path: ['/test','/cachereset']
  }))

  routerapp.post("/cachereset",       apitest.cacheReset);
  routerapp.get("/test",              apitest.test );
  routerapp.get("/opstest",           apitest.opstest );
  routerapp.get("/fsearch",           apitest.search );
  routerapp.get("/search",            apisearch.search );
  routerapp.get("/publication",       apisearch.publication );
  myapp.use('/api/v1', routerapp);
  // routerappbeta.get("/search",        apisearch.search );
  // routerappbeta.get("/publication",       apisearch.publication );
  // myapp.use('/api/v1/beta', routerappbeta);

  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};