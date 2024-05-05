// requires
const _ = require('lodash');
const dotenv = require('dotenv');

// module variables 
const config = require('./config/config.json');
const defaultConfig = config.development; //development is the default config...  
const environment = process.env.NODE_ENV || 'production';
const environmentConfig = config[environment]; //...and is overriden by the running one (production)
const finalConfig = _.merge(defaultConfig, environmentConfig); //this is the finalconfig
dotenv.config(); //repo config is overriden by env vars
finalConfig.ops.opsBaseUrl = process.env.OPSBASEURL;
finalConfig.ops.opsClientID = process.env.OPSCLIENTID;
finalConfig.ops.opsClientSecret = process.env.OPSCLIENTSECRET;
finalConfig.sqlConfigPool.user = process.env.SQLCONFIG_DBUSER;
finalConfig.sqlConfigPool.password = process.env.SQLCONFIG_DBPW;
finalConfig.sqlConfigPool.server = process.env.SQLCONFIG_DBSERVER;
finalConfig.sqlConfigPool.database = process.env.SQLCONFIG_DBNAME;
finalConfig.identity.auth0Domain = process.env.AUTH0_DOMAIN
finalConfig.identity.auth0AppAudience = process.env.AUTH0_APPAUDIENCE
finalConfig.identity.auth0MgmtAudience = process.env.AUTH0_MGMTAUDIENCE
finalConfig.identity.auth0SPAClientId = process.env.AUTH0_SPACLIENTID
finalConfig.identity.auth0SPASecret = process.env.AUTH0_SPASECRET
finalConfig.identity.auth0M2MClientId = process.env.AUTH0_M2MCLIENTID
finalConfig.identity.auth0M2MSecret = process.env.AUTH0_M2MSECRET

finalConfig.app.loglevel = process.env.LOGLEVEL || finalConfig.app.loglevel;
finalConfig.app.serverPort = process.env.SERVERPORT || finalConfig.app.serverPort;

finalConfig.ops.opsMaxResults = process.env.MAXOPSRESULTS || finalConfig.ops.opsMaxResults;

finalConfig.ops.opsCountryPrio = process.env.COUNTRYPRIO || finalConfig.ops.opsCountryPrio;
finalConfig.ops.opsDefPubPrioCrit = process.env.DEFPUBPRIOCRIT || finalConfig.ops.opsDefPubPrioCrit;

if (!finalConfig.ops.opsBaseUrl) { console.log("Fatal error: OPSBASEURL missing"); };
if (!finalConfig.ops.opsClientID) { console.log("Fatal error: OPSCLIENTID missing"); };
if (!finalConfig.ops.opsClientSecret) { console.log("Fatal error: OPSCLIENTSECRET missing"); };


module.exports.config = finalConfig;
module.exports.environment = environment;