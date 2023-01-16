module.exports = myapp => {
  const routerapp =      require("express").Router();
  const routermetrics = require("express").Router();
  const apiexternal = require("../logic/api.logic");
  const apihealth = require("../logic/health");

  routerapp.get("/test",      apiexternal.test );
  myapp.use('/api/v1', routerapp);

  routermetrics.get("/health", apihealth.health);
  myapp.use('/', routermetrics);
};