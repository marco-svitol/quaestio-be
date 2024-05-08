module.exports = myapp => {
  var { unless } = require('express-unless');

  const routerapp = require("express").Router();
  const routermetrics = require("express").Router();

  const apitest = require("../logic/v2/api.test.js");
  const apisearchv2 = require("../logic/v2/api.search.js");
  const apiuserprofile = require("../logic/v2/api.userprofile.js");
  const apibookmark = require("../logic/v2/api.bookmark.js");
  const apinotes = require("../logic/v2/api.notes.js");
  const apiidentity = require("../logic/v2/api.identity.js");
  const apicache = require("../logic/v2/api.cache.js");
  const apiopsmonitoring = require("../logic/v2/api.opsMonitoring.js");

  const apihealth = require("../logic/health.js");

  const { errorHandler } = require("../identity/error.middleware");
  const { notFoundHandler } = require("../identity/not-found.middleware");

  const { validateAccessTokenMiddleWare, getIdentityInfoMiddleware } = require("../identity/auth0.middleware.js");

  const expressMiddleware = require("../express/header.middleware.js");

  validateAccessTokenMiddleWare.unless = unless;
  routerapp.use(validateAccessTokenMiddleWare.unless({
    path: [
      '/api/v2/test',
      '/api/v2/version'
    ]
  }));

  getIdentityInfoMiddleware.unless = unless;
  routerapp.use(getIdentityInfoMiddleware.unless({
    path: [
      '/api/v2/test',
      '/api/v2/version'
    ]
  }));

  //not protected
  routerapp.get("/v2/test", apitest.test);
  routerapp.get("/v2/version", apitest.version);
  //protected
  routerapp.get("/v2/opstest", apitest.opstest);
  routerapp.get("/v2/opendoc", apisearchv2.opendoc, expressMiddleware.setCustomHeaders, expressMiddleware.sendRes);
  routerapp.patch("/v2/bookmark", apibookmark.bookmark);
  routerapp.post("/v2/bmfolder", apibookmark.bmfolder);
  routerapp.get("/v2/firstpageClipping", apisearchv2.firstpageClipping);
  routerapp.get("/v2/search", apisearchv2.search, expressMiddleware.setCustomHeaders, expressMiddleware.sendRes );
  routerapp.get("/v2/userprofile", apiuserprofile.userprofile, expressMiddleware.setCustomHeaders, expressMiddleware.sendRes );
  routerapp.get("/v2/searchbookmark", apibookmark.searchbookmark);
  routerapp.patch("/v2/notes", apinotes.notes);
  routerapp.patch("/v2/changepassword", apiidentity.changepassword);
  routerapp.delete("/v2/cachereset", apicache.cacheReset);
  routerapp.get("/v2/cachestats", apicache.cacheStats);
  routerapp.get("/v2/cachekeys", apicache.cacheKeys);
  routerapp.get("/v2/opsMonitoring", apiopsmonitoring.opsMonitoring);

  myapp.use('/api', routerapp);

  routerapp.use(errorHandler);
  routerapp.use(notFoundHandler);

  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};
