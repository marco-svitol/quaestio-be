// requires
const _         = require('lodash');
const dotenv    = require('dotenv');

// module variables 
const config                        = require('./config/config.json');
const defaultConfig                 = config.development;
const environment                   = process.env.NODE_ENV || 'production';
const environmentConfig             = config[environment];
const finalConfig                   = _.merge(defaultConfig, environmentConfig);
dotenv.config();
finalConfig.certpath                = process.env.CERTPATH;
finalConfig.certpw                  = process.env.CERTPW;
finalConfig.sqlConfigPool.user      = process.env.SQLCONFIG_DBUSER;
finalConfig.sqlConfigPool.password  = process.env.SQLCONFIG_DBPW;
finalConfig.sqlConfigPool.server    = process.env.SQLCONFIG_DBSERVER;
finalConfig.sqlConfigPool.database  = process.env.SQLCONFIG_DBNAME;
module.exports.config               = finalConfig;