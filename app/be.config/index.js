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
finalConfig.certpath = process.env.CERTPATH;
finalConfig.certpw = process.env.CERTPW;

module.exports.config = finalConfig;