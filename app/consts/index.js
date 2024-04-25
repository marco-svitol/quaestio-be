const logger=require('../logger');

const opsService=require('../ops');
const opsQuaestio = new opsService();

const auth0MgmtAPI = require('../identity');
const identity = new auth0MgmtAPI(); 

const msgDatabaseError = 'Database error';
const msgServerError = 'Server error';


module.exports = {
    opsQuaestio,
    msgDatabaseError,
    msgServerError,
    identity,
    logger
}