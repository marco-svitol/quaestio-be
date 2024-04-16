module.exports = myapp => {
  var { unless } = require('express-unless');

  const routerapp = require("express").Router();
  const routermetrics = require("express").Router();

  const apitest = require("../logic/v2/api.test.js");
  const apisearchv2 = require("../logic/v2/api.search.js");
  const apiuserprofile = require("../logic/v2/api.userprofile.js");
  const apibookmark = require("../logic/v2/api.bookmark.js");
  const apinotes = require("../logic/v2/api.notes.js");
  const apihealth = require("../logic/health.js");

  const { errorHandler } = require("../identity/error.middleware");
  const { notFoundHandler } = require("../identity/not-found.middleware");

  const { validateAccessTokenMiddleWare, getIdentityInfoMiddleware } = require("../identity/auth0.middleware.js");

  validateAccessTokenMiddleWare.unless = unless;
  routerapp.use(validateAccessTokenMiddleWare.unless({
    path: [
      '/api/v2/test',
      '/api/v2/cachereset',
    ]
  }));

  getIdentityInfoMiddleware.unless = unless;
  routerapp.use(getIdentityInfoMiddleware.unless({
    path: [
      '/api/v2/test',
      '/api/v2/cachereset',
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
      '/api/v2/search',
      '/api/v2/userprofile',
    ]
  }))
*/
  //V2
  //not protected
  routerapp.post("/v2/cachereset", apitest.cacheReset);
  routerapp.get("/v2/test", apitest.test);
  //protected
  routerapp.get("/v2/opstest", apitest.opstest);
  routerapp.get("/v2/opendoc", apisearchv2.opendoc);
  routerapp.patch("/v2/bookmark", apibookmark.bookmark);
  routerapp.post("/v2/bmfolder", apibookmark.bmfolder);
  routerapp.get("/v2/firstpageClipping", apisearchv2.firstpageClipping);
  routerapp.get("/v2/search", apisearchv2.search);
  routerapp.get("/v2/userprofile", apiuserprofile.userprofile);
  routerapp.get("/v2/searchbookmark", apibookmark.searchbookmark);
  routerapp.patch("/v2/notes", apinotes.notes);


  myapp.use('/api', routerapp);

  routerapp.use(errorHandler);
  routerapp.use(notFoundHandler);

  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};
