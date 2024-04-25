const consts=require('../../consts'); 
const msgServerError = consts.msgServerError;
const db=require('../../database');
const status = ["new", "listed", "viewed"];
const identity = consts.identity;

exports.changepassword = async ( req, res) => {
  const oldpassword = req.query.oldpassword;
  const newpassword = req.query.newpassword;
  const username = req.auth.userInfo.email;

  //verify old password
  const verifyPwResponse = await identity.verifyOldPassword(oldpassword, username);

  if (verifyPwResponse.status === 200){
    consts.logger.debug(`changepassword: old password verification was succesfull`); 
  }else{
    consts.logger.debug(`changepassword: error ${verifyPwResponse.status}`);
    return res.status(verifyPwResponse.status).send(verifyPwResponse.message?verifyPwResponse.message:msgServerError);
  }
  
  //set new password
  const setPwResponse = await identity.setPassword(newpassword, req.auth.payload.sub, req.headers.authorization);
  if (setPwResponse.status === 200){
    consts.logger.debug(`changepassword: new password was set succesfully`);
    return res.status(200).send();
  }else{
    consts.logger.error(`changepassword: error ${setPwResponse.status} ${setPwResponse.message}`);
    return res.status(setPwResponse.status).send(setPwResponse.message);
  }  
} 