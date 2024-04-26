const { isError } = require('lodash');
const logger=require('../logger'); 
const axios=require('axios');
const msgServerError = require('../consts').msgServerError;

const authAxiosInstance = axios.create();

//Refresh token must be global, otherwise Axios interceptro cannot scope it.
async function getToken(body, authorizationToken = null) {//{ = (next) => {
  let response;
  let authOptions = {
    baseURL: `${global.config_data.identity.auth0OAuthTokenEndpoint}`,
    headers: {
      'Accept' : 'application/json',
      'Content-Type' : 'application/json'
    },
  };
  if (authorizationToken){
    authOptions = {
      ...authOptions,
      'Authorization' : `Bearer ${authorizationToken}`
    }
  };
  await authAxiosInstance.post("/", body, authOptions)
    .then((r) => {
      response = r;
    })
    .catch((err) => {
      response = err;
    })
  return response
}

module.exports = class auth0MgmtAPI{
  constructor() {
    this.auth0Axios = this.createCommonAxiosInstance();
  }

  accessToken = null;
  mgmtAPIToken = null;
  
  bodyMgmtAPIRequest =
  {
      "client_id": global.config_data.identity.auth0M2MClientId,
      "client_secret": global.config_data.identity.auth0M2MSecret,
      "grant_type": "client_credentials",
      "audience": global.config_data.identity.auth0MgmtAudience
  };

  bodyApplicatiomAPIRequest =
  {
      "client_id": global.config_data.identity.auth0SPAClientId,
      "client_secret": global.config_data.identity.auth0SPASecret,
      "grant_type": "password",
      "audience": global.config_data.identity.auth0AppAudience,
      "username": '',
      "password": ''
  };

  createCommonAxiosInstance(){
    const newAxios = axios.create();
    
    newAxios.interceptors.request.use(
      async config => {
        config.baseURL = `https://${global.config_data.identity.auth0Domain}/api`,
        config.headers = {
            'Accept' : 'application/json',
            'Content-Type' : 'application/json'
        }
        if (this.mgmtAPIToken){
          config.headers = {
            ...config.headers,
            'Authorization' : `Bearer ${this.mgmtAPIToken}`
          }
        };
        return config;
      },
      error => {
        Promise.reject(error);
      }
    );

    newAxios.interceptors.response.use(
      (response) => {return response},
      async (error) => {
        if (error.response && error.config) {
          const statuscode = error.response.status;
          const originalRequest = error.config;
          logger.debug(`Auth0Axios: ${error.response.status} : ${error.response.data.message}`);
          if ([401,403].includes(statuscode) && !originalRequest._retry ){
            originalRequest._retry = true;
            const response =  await getToken(this.bodyMgmtAPIRequest, this.accessToken);
            this.mgmtAPIToken = response.data.access_token;
            logger.debug (`Successfully acquired management API token from Auth0. It will expire in approximately ${(response.data.expires_in/60).toFixed(2)} minutes.`);
            return newAxios(originalRequest); 
          }
        }
      return Promise.reject(error);
    })
    
    return newAxios;
  }

  async verifyOldPassword(oldpassword, username){
    this.bodyApplicatiomAPIRequest.password = oldpassword;
    this.bodyApplicatiomAPIRequest.username = username;
    const response =  await getToken(this.bodyApplicatiomAPIRequest);
    if (isError(response)){
      const errMsg = response?.response?.data?.error_description ? response.response.data.error_description : msgServerError
      logger.error (`verifyOldPassword: error while retrieving token: ${response.response.status} ${errMsg}`);
      return { status: response.response.status, message: errMsg }
      }
    else{
      logger.debug(`verifyOldPassword: status is ${response.status}`)
      return { status: response.status}
    }
  }

  async setPassword(newpassword, uid, accessToken){
    this.accessToken = accessToken;
    const patchAuth0PasswordURI = `/v2/users/${uid}`;
    const body = {
      "password": newpassword,
      "connection": "Username-Password-Authentication"
    };

    return this.auth0Axios.patch(patchAuth0PasswordURI, body)
      .then(response => {
        return { status: response.status}
      })
      .catch(error => {
        const errMsg = error?.response?.data?.message ? error.response.data.message : msgServerError
        logger.error (`setPassword: error while changing password token: ${error.response.status} ${errMsg}`);
        return { status: error.response.status, message: errMsg }
      });
  }

}
