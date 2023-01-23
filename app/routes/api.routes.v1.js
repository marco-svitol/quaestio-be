module.exports = myapp => {
  const routerapp =      require("express").Router();
  const routermetrics = require("express").Router();
  const apitest = require("../logic/v1/api.test");
  const apisearch = require("../logic/v1/api.search")
  const apihealth = require("../logic/health");

  routerapp.get("/test",      apitest.test );
  routerapp.get("/search",      apisearch.search );
  myapp.use('/api/v1', routerapp);

  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};