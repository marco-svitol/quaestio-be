const logger=require('../logger');
const opsService=require('../ops');
const opsQuaestio = new opsService();

opsQuaestio.refreshToken( (err) => {
    if (!err) {
        logger.info (`Authentication to OPS server succesfull. Token will expire in ${opsQuaestio.authResponse.expires_in} seconds`);
    }
    else{
        logger.error (`Authentication to OPS server failed. ${err}. Exiting`)
    }
    })

module.exports = {
    opsQuaestio
}