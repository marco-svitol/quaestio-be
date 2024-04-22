const consts=require('../../consts'); 
const msgServerError = consts.msgServerError;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const identity = consts.identity;

exports.changepassword = async ( req, res) => {
    const oldpassword = req.query.oldpassword;
    const newpassword = req.query.newpassword;
    const username = req.auth.userInfo.username;

    identity.verifyOldPassword(oldpassword, username);
    
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