const { isError } = require('lodash');
const logger=require('../logger'); 
const axios=require('axios');
const msgServerError = require('../consts').msgServerError;

module.exports = class auth0MgmtAPI{
  constructor() {
    this.auth0MgmtAxios = this.createCommonAxiosInstance();
    this.auth0AppAxios = this.createAuth0AppAxiosInstance();
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
            const response =  await this.auth0AppAxios.post('/', this.bodyMgmtAPIRequest);
            this.mgmtAPIToken = response.data.access_token;
            logger.debug (`Successfully acquired management API token from Auth0. It will expire in approximately ${(response.data.expires_in/60).toFixed(2)} minutes.`);
            return newAxios(originalRequest); 
          }
        }
      return Promise.reject(error);
    })
    
    return newAxios;
  }

  createAuth0AppAxiosInstance(){
    const newAxios = axios.create();

    newAxios.interceptors.request.use(
      async config => {
        config.baseURL = `${global.config_data.identity.auth0OAuthTokenEndpoint}`,
        config.headers = {
            'Accept' : 'application/json',
            'Content-Type' : 'application/json'
        }
        if (this.accessToken){
          config.headers = {
            ...config.headers,
            'Authorization' : `Bearer ${this.accessToken}`
          }
        };
        return config;
      },
      error => {
        Promise.reject(error);
      }
    );
    return newAxios;
  }

  async verifyOldPassword(oldpassword, username){
    this.bodyApplicatiomAPIRequest.password = oldpassword;
    this.bodyApplicatiomAPIRequest.username = username;
    return this.auth0AppAxios.post('/', this.bodyApplicatiomAPIRequest)
      .then(response => {
        logger.debug(`verifyOldPassword: status is ${response.status}`)
        return { status: response.status}
      })
      .catch(error => {
        const errMsg = error?.response?.data?.error_description ? error.response.data.error_description : msgServerError
        logger.error (`verifyOldPassword: error while retrieving token: ${error.response.status} ${errMsg}`);
        return { status: error.response.status, message: errMsg }
      });
  }

  async setPassword(newpassword, uid, accessToken){
    this.accessToken = accessToken;
    const patchAuth0PasswordURI = `/v2/users/${uid}`;
    const body = {
      "password": newpassword,
      "connection": "Username-Password-Authentication"
    };

    return this.auth0MgmtAxios.patch(patchAuth0PasswordURI, body)
      .then(response => {
        return { status: response.status}
      })
      .catch(error => {
        const errMsg = error.response?.data?.message ? error.response.data.message : error.response?.data?.error_description;
        logger.error (`setPassword: error while changing password token: ${error.response.status} ${errMsg}`);
        return { status: error.response.status, message: errMsg }
      });
  }

}
