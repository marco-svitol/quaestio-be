// requires
const _ = require('lodash');
const dotenv = require('dotenv');

// module variables 
const config = require('./config/config.json');
const defaultConfig = config.development;
const environment = process.env.NODE_ENV || 'production';
const environmentConfig = config[environment];
const finalConfig = _.merge(defaultConfig, environmentConfig);
dotenv.config();
finalConfig.app.opsBaseUrl = process.env.OPSBASEURL;
finalConfig.app.opsClientID = process.env.OPSCLIENTID;
finalConfig.app.opsClientSecret = process.env.OPSCLIENTSECRET;
finalConfig.app.certpath = process.env.CERTPATH;
finalConfig.app.certpw = process.env.CERTPW;
finalConfig.sqlConfigPool.user = process.env.SQLCONFIG_DBUSER;
finalConfig.sqlConfigPool.password = process.env.SQLCONFIG_DBPW;
finalConfig.sqlConfigPool.server = process.env.SQLCONFIG_DBSERVER;
finalConfig.sqlConfigPool.database = process.env.SQLCONFIG_DBNAME;

finalConfig.app.loglevel = process.env.LOGLEVEL || finalConfig.app.loglevel;
finalConfig.app.serverPort = process.env.SERVERPORT || finalConfig.app.serverPort;

if (!finalConfig.app.opsBaseUrl) { console.log("Fatal error: OPSBASEURL missing"); };
if (!finalConfig.app.opsClientID) { console.log("Fatal error: OPSCLIENTID missing"); };
if (!finalConfig.app.opsClientSecret) { console.log("Fatal error: OPSCLIENTSECRET missing"); };


module.exports.config = finalConfig;
module.exports.environment = environment;