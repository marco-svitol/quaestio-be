const logger=require('../logger');
const opsService=require('../ops');
const opsQuaestio = new opsService();
const msgDatabaseError = 'Database error';
const msgServerError = 'Server error';

module.exports = {
    opsQuaestio,
    msgDatabaseError,
    msgServerError
}