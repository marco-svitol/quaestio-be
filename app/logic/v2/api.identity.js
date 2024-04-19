const logger=require('../../logger'); 
const msgServerError = require('../../consts').msgServerError;
const db=require('../../database');
const status = ["new", "listed", "viewed"];

exports.changepassword = async ( req, res) => {
    const oldpassword = req.query.oldpassword;
    const newpassword = req.query.newpassword;

    //verify old password against oauth/token
    //if password not ok return old password wrong

    //set new password
    //if mgmnt token is expired or not set retrieve it (as we do for OPS) 
    //   and restart from set new password
    
    //if Auth0 returns error 
        // check if error can be forwarded to frontend as for password policy not met..
        // and in case send it back to front end
    
    //send ok 200 to frontend
} 


const auth0ClientId = global.config_data.identity.auth0SPAClientId;
const auth0Secret = global.config_data.identity.auth0SPASecret;
const auth0Audience = global.config_data.identity.auth0Audience;
const grantType = "client_credentials"

getAPIAccessToken(auth0ClientId, auth0Secret, auth0Audience, grantType);

const auth0ClientId = global.config_data.identity.auth0SPAClientId;
const auth0Secret = global.config_data.identity.auth0SPASecret;
const auth0Audience = global.config_data.identity.auth0Audience;
const grantType = "password"
getAPIAccessToken(auth0ClientId, auth0Secret, auth0Audience, grantType, username, oldpassword);

function getAPIAccessToken(auth0ClientId, auth0Secret, auth0Audience, grantType, username = "", password = ""){
    const endpoint = global.config_data.identity.auth0Endpoint;
    const body = 
    {
        "client_id": auth0SPAClientId,
        "client_secret": auth0SPASecret,
        "grant_type": "password",
        "audience": auth0Audience,
        "username": username,
        "password": password
    }
} 