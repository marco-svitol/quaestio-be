module.exports = myapp => {
  var {unless}          = require('express-unless');

  const routerapp      = require("express").Router();
  const routermetrics   = require("express").Router();

  const apitest         = require("../logic/v2/api.test.js");
  const apisearchv2     = require("../logic/v2/api.search.js");
  const apihealth       = require("../logic/health.js");
  const apiauth         = require("../logic/v1/api.auth.js");
  const apiauthv2       = require("../logic/v2/api.auth.js");
  
  const { errorHandler } = require("../middleware/error.middleware");
  const { notFoundHandler } = require("../middleware/not-found.middleware");

  const { validateAccessToken } = require("../middleware/auth0.middleware.js");

  validateAccessToken.unless = unless;
  routerapp.use(validateAccessToken.unless({
    path: [
      '/api/v2/test',
      '/api/v2/cachereset',
      '/api/v1/auth/login',
      '/api/v2/auth/login',
      '/api/v1/auth/refresh',
      '/api/v2/search',
      '/api/v2/userprofile',
      '/api/v2/opstest',
      '/api/v2/opendoc',
      '/api/v2/firstpageClipping',
    ]
  }));

  apiauth.checkJWT.unless = unless;
  routerapp.use(apiauth.checkJWT.unless({
    path: [
      '/api/v2/test',
      '/api/v2/cachereset',
      '/api/v1/auth/login',
      '/api/v2/auth/login',
      '/api/v1/auth/refresh',
      '/api/v2/auth0search',
      '/api/v2/auth0userprofile',
      '/api/v2/auth0opendoc',
      '/api/v2/auth0firstpageClipping',
    ]
  }));

  /*
  const cacheMiddleware = require('../cache/index.js').cacheMiddleware;
  cacheMiddleware.unless = unless; 
  routerapp.use(cacheMiddleware.unless({
    path: [
      '/api/v2/cachereset',
      '/api/v2/test',
      '/api/v2/opstest',
      "/api/v2/firstpageClipping",
      '/api/v1/auth/login',
      '/api/v2/auth/login',
      '/api/v1/auth/refresh',
      '/api/v2/search',
      '/api/v2/userprofile',
    ]
  }))
*/
  //v1
    //not protected
  routerapp.get("/v1/auth/login",        apiauth.login);
  routerapp.get("/v1/auth/refresh",      apiauth.refresh);
  //V2
    //not protected
  routerapp.post("/v2/auth/login",       apiauthv2.login);
  routerapp.post("/v2/cachereset",       apitest.cacheReset);
  routerapp.get("/v2/test",              apitest.test );
    //protected
  routerapp.get("/v2/opstest",           apitest.opstest );
  routerapp.get("/v2/opendoc",           apisearchv2.opendoc);
  routerapp.get("/v2/firstpageClipping", apisearchv2.firstpageClipping);
  routerapp.get("/v2/search",            apisearchv2.search );
  routerapp.get("/v2/userprofile",       apisearchv2.userprofile);
    //protected Auth0
  routerapp.get("/v2/auth0search",       apisearchv2.search );
  routerapp.get("/v2/auth0userprofile",  apisearchv2.userprofile);
  routerapp.get("/v2/auth0opendoc",           apisearchv2.opendoc);
  routerapp.get("/v2/auth0firstpageClipping", apisearchv2.firstpageClipping);


  myapp.use('/api', routerapp);

  routerapp.use(errorHandler);
  routerapp.use(notFoundHandler);
  
  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};
