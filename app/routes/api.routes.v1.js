module.exports = myapp => {
  var {unless}          = require('express-unless');
  const routerapp      = require("express").Router();
  const routermetrics   = require("express").Router();
  const apitest         = require("../logic/v2/api.test");
  const apisearchv2     = require("../logic/v2/api.search");
  const apihealth       = require("../logic/health");
  const apiauth         = require("../logic/v1/api.auth");
  const apiauthv2       = require("../logic/v2/api.auth");
  
  const cacheMiddleware = require('../cache').cacheMiddleware;

  apiauth.checkJWT.unless = unless;
  routerapp.use(apiauth.checkJWT.unless({path: ['/api/v1/test','/api/v1/cachereset','/api/v1/auth/login','/api/v1/auth/refresh','/api/v2/auth/login']}));

  cacheMiddleware.unless = unless; 
  routerapp.use(cacheMiddleware.unless({
    path: [
      '/api/v2/cachereset',
      '/api/v2/test',
      '/api/v2/opstest',
      "/api/v2/firstpageClipping",
      '/api/v1/auth/login',
      '/api/v1/auth/refresh',
      '/api/v2/search',
      '/api/v2/userprofile',
      '/api/v2/auth/login',
    ]
  }))

  //v1
  routerapp.get("/v1/auth/login",        apiauth.login);
  routerapp.get("/v1/auth/refresh",      apiauth.refresh);
  //V2
  routerapp.post("/v2/auth/login",       apiauthv2.login);
  routerapp.post("/v2/cachereset",       apitest.cacheReset);
  routerapp.get("/v2/test",              apitest.test );
  routerapp.get("/v2/opstest",           apitest.opstest );
  routerapp.get("/v2/opendoc",           apisearchv2.opendoc);
  routerapp.get("/v2/firstpageClipping", apisearchv2.firstpageClipping);
  routerapp.get("/v2/search",            apisearchv2.search );
  routerapp.get("/v2/userprofile",       apisearchv2.userprofile);

  myapp.use('/api', routerapp);

  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};
