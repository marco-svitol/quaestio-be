module.exports = myapp => {
  var {unless}          = require('express-unless');
  const routerapp       = require("express").Router();
  const routermetrics   = require("express").Router();
  const apitest         = require("../logic/v1/api.test");
  const apisearch       = require("../logic/v1/api.search")
  const apihealth       = require("../logic/health");
  const apiauth         = require("../logic/v1/api.auth");
  const cacheMiddleware = require('../cache').cacheMiddleware;

  apiauth.checkJWT.unless = unless;
  routerapp.use(apiauth.checkJWT.unless({path: ['/api/v1/test','/api/v1/cachereset','/api/v1/auth/login','/api/v1/auth/refresh']}));

  cacheMiddleware.unless = unless; 
  routerapp.use(cacheMiddleware.unless({
    path: [
      '/api/v1/cachereset',
      '/api/v1/test',
      '/api/v1/opstest',
      '/api/v1/search',
      '/api/v1/userprofile',
      "/api/v1/firstpageClipping",
      '/api/v1/auth/login',
      '/api/v1/auth/refresh'
    ]
  }))

  routerapp.post("/cachereset",       apitest.cacheReset);
  routerapp.get("/test",              apitest.test );
  routerapp.get("/opstest",           apitest.opstest );
  routerapp.get("/search",            apisearch.search );
  //routerapp.get("/publication",       apisearch.publication );
  routerapp.get("/userprofile",       apisearch.userprofile);
  routerapp.get("/opendoc",           apisearch.opendoc);
  routerapp.get("/firstpageClipping", apisearch.firstpageClipping);
  routerapp.get("/auth/login",        apiauth.login);
  routerapp.get("/auth/refresh",      apiauth.refresh);
  myapp.use('/api/v1', routerapp);

  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};
