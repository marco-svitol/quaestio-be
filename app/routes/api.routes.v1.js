module.exports = myapp => {
  var {unless}          = require('express-unless');
  const routerapp      = require("express").Router();
  const routermetrics   = require("express").Router();
  const apitest         = require("../logic/v1/api.test");
  const apisearchv1     = require("../logic/v1/api.search");
  const apisearchv2     = require("../logic/v2/api.search");
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
      '/api/v1/auth/refresh',
      '/api/v2/search',
      '/api/v2/userprofile'
    ]
  }))

  //v1
  routerapp.post("/v1/cachereset",       apitest.cacheReset);
  routerapp.get("/v1/test",              apitest.test );
  routerapp.get("/v1/opstest",           apitest.opstest );
  routerapp.get("/v1/search",            apisearchv1.search );
  routerapp.get("/v1/userprofile",       apisearchv1.userprofile);
  routerapp.get("/v1/opendoc",           apisearchv1.opendoc);
  routerapp.get("/v1/firstpageClipping", apisearchv1.firstpageClipping);
  routerapp.get("/v1/auth/login",        apiauth.login);
  routerapp.get("/v1/auth/refresh",      apiauth.refresh);
  //v2
  routerapp.get("/v2/search",            apisearchv2.search );
  routerapp.get("/v2/userprofile",       apisearchv2.userprofile);

  myapp.use('/api', routerapp);

  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};
