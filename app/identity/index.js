const logger=require('../logger'); 
const axios=require('axios');
const msgServerError = require('../consts').msgServerError;

//Authentication Axios instance
const authOptions = {
  baseURL: `${global.config_data.identity.auth0OAuthTokenEndpoint}`,
  headers: {
    'Authorization': '',
    'Accept' : 'application/json'
  },
};

const authAxiosInstance = axios.create(authOptions);

//Initialize authResponse object where access_token is stored
let authResponse = {access_token: '', expires_in: 0};

//Refresh token must be global, otherwise Axios interceptro cannot scope it.
async function getToken(body, authorizationToken = '') {//{ = (next) => {
  const config = {
    headers: {
      'Authorization': authorizationToken
    }
  };
  body.append('extraparam', 'value');
  await authAxiosInstance.post("/", body, config)
    .then((response) => {
      authResponse=response.data;
    })
    .catch((err) => {
      logger.error (`Fatal error while retrieving token from OPS: ${err}`);
      throw err;
    })
}

module.exports = class auth0MgmtAPI{
  constructor() {
    this.auth0Axios = this.createCommonAxiosInstance();
  }

  //I prob need to set accesToken (coming from front end),
  //to this object. But how to make it dynamic?
  
  bodyMgmtAPIRequest = 
  {
      "client_id": global.config_data.identity.auth0M2MClientId,
      "client_secret": global.config_data.identity.auth0M2MSecret,
      "grant_type": "client_credentials",
      "audience": global.config_data.identity.auth0Audience
  }

  bodyApplicatiomAPIRequest = 
  {
      "client_id": global.config_data.identity.auth0SPAClientId,
      "client_secret": global.config_data.identity.auth0SPASecret,
      "grant_type": "password",
      "audience": global.config_data.identity.auth0Audience,
      "username": '',
      "password": ''
  }

  createCommonAxiosInstance(){
    const newAxios = axios.create();
    
    newAxios.interceptors.request.use(
      async config => {
        config.baseURL = `${global.config_data.identity.auth0Audience}`,
        config.headers = {
            Authorization : `Bearer ${authResponse.access_token}`,
            Accept : 'application/json'
        }
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
          logger.debug(`Auth0Axios: ${error.code} : ${error.response.data}`);
          if ((!authResponse.access_token || [400,401,403].includes(statuscode)) && !originalRequest._retry ){
            originalRequest._retry = true;
            await getToken(bodyMgmtAPIRequest, req.headers.authorization);
            logger.debug (`Successfully acquired managemrnt API token from Auth0, will expire in ${authResponse.expires_in/60} minutes`);
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
    return await getToken(this.bodyApplicatiomAPIRequest);
  }
}
