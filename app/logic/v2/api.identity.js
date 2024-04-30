const consts=require('../../consts'); 
const msgServerError = consts.msgServerError;
const identity = consts.identity;

exports.changepassword = async ( req, res) => {
  const oldpassword = req.body.oldpassword;
  const newpassword = req.body.newpassword;
  const username = req.auth.userInfo.email;

  //verify old password
  const verifyPwResponse = await identity.verifyOldPassword(oldpassword, username);

  if (verifyPwResponse.status === 200){
    logger.debug(`changepassword: old password verification was succesfull`); 
  }else{
    logger.debug(`changepassword: error ${verifyPwResponse.status}`);
    return res.status(verifyPwResponse.status).send(verifyPwResponse.message?verifyPwResponse.message:msgServerError);
  }
  
  //set new password
  const setPwResponse = await identity.setPassword(newpassword, req.auth.payload.sub, req.headers.authorization);
  if (setPwResponse.status === 200){
    logger.debug(`changepassword: new password was set succesfully`);
    return res.status(200).json({message: `password changed succesfully`});
  }else{
    logger.error(`changepassword: error ${setPwResponse.status} ${setPwResponse.message}`);
    return res.status(setPwResponse.status).send(setPwResponse.message);
  }  
} 