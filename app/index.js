//config = require('./be.config');
global.config_data = require('./be.config').config;
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const logger=require('./logger'); 
const server=require('./server');
const rTracer = require('cls-rtracer');

app.use(rTracer.expressMiddleware());							// keep s unique ID for each request
app.use(bodyParser.json()); 									// parse requests of content-type - application/json
app.use(bodyParser.urlencoded({ extended: true })); // parse requests of content-type - application/x-www-form-urlencoded
app.use((req, res, next) => {
	logger.srvconsoledir(req) 																			//logs every request
	req.body = new Proxy(req.body, {  																	// case insensitive parameter name
    get: (target, name) => target[Object.keys(target)
			.find(key => key.toLowerCase() === name.toLowerCase())]	
		})																																	
	next();
});

require("./routes/api.routes.v1")(app);
server(app, () =>{
	logger.info(`Quaestio backend server is running. Listening on port ${process.env.SERVERPORT} and node_env is ${process.env.NODE_ENV}.`)
})

