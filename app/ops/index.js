const axios=require('axios');
const logger=require('../logger'); 

//Authentication Axios instance
let authParams = new URLSearchParams({grant_type : 'client_credentials'});
authParams.append('extraparam', 'value');
const authOptions = {
  baseURL: `${global.config_data.app.opsBaseUrl}`,
  headers: {
    'Authorization': `Basic ${Buffer.from(global.config_data.app.opsClientID+":"+global.config_data.app.opsClientSecret,'utf8').toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
};
const authAxiosInstance = axios.create(authOptions);

//Initialize authResponse object where access_token is stored
let authResponse = {access_token: '', expires_in: 0};

//Refresh token must be global, otherwise Axios interceptro cannot scope it.
async function refreshToken() {//{ = (next) => {
  await authAxiosInstance.post("/auth/accesstoken", authParams)
    .then((response) => {
      authResponse=response.data;
    })
    .catch((err) => {
      logger.error (`Fatal error while retrieving token from OPS: ${err}`);
      throw err;
    })
}

module.exports = class opsService{
  constructor() {
    this.commonAxiosInstance = this.createCommonAxiosInstance();
  }

  createCommonAxiosInstance(){
    const newAxios = axios.create();
    
    newAxios.interceptors.request.use(
      async config => {
        config.baseURL = `${global.config_data.app.opsBaseUrl}`,
        config.headers = {
            Authorization : `Bearer ${authResponse.access_token}`,
            Accept : 'application/json, application/pdf, application/jpeg, application/gif'
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
          if ((!authResponse.access_token || [400,401,403].includes(statuscode)) && !originalRequest._retry ){
            originalRequest._retry = true;
            await refreshToken();
            logger.debug (`Successfully acquired token from OPS, will expire in ${authResponse.expires_in} seconds`);
            return newAxios(originalRequest); 
          }
        }
      return Promise.reject(error);
    })
    return newAxios;
  }

  async publishedDataSearch(strQuery, next){
    this.commonAxiosInstance.get("/rest-services/published-data/search?q="+strQuery)
    .then(async (response) => {
      //Range! 
      let docs=[];
      let opsLights=[];
      for (const doc of response.data['ops:world-patent-data']['ops:biblio-search']['ops:search-result']['ops:publication-reference']){
        let docid=doc['document-id']['country']['$']+'.'+doc['document-id']['doc-number']['$']+'.'+doc['document-id']['kind']['$'];
        let docUrl=`https://worldwide.espacenet.com/publicationDetails/biblio?FT=D&CC=${doc['document-id']['country']['$']}&NR=${doc['document-id']['doc-number']['$']}${doc['document-id']['kind']['$']}&KC=${doc['document-id']['kind']['$']}`;
        let doctype=doc['document-id']['@document-id-type'];
        if (doctype==="docdb"){
          await this.pubblicationDataFiltered(docid, "en", async(err, docData, opsLight) => {
          if (docData){  
              docs.push({"doc_num":docid,"type":"docdb","invention_title":docData.title,"date":docData.date,"abstract":docData.abstract,"applicant":docData.applicant,"inventor_name":docData.inventor,"ops_link":docUrl});
              opsLights = [];
              opsLights.push(opsLight);
            }else{
              throw (err);
            }
         })
        }
      };
      return next(null, docs, opsLights);

      //Semaphors + quota
      return next(null, response.data, response.headers);
    })
    .catch((err) => {
      return next(err, null, null);  
    })
  }

  async publishedDataPubblicationDocDB(strQuery, next){
    this.commonAxiosInstance.get(`/rest-services/published-data/publication/docdb/${strQuery}/`)
    .then((response) => {
      return next(null, response.data, response.headers);
    })
    .catch((err) => {
      return next(err, null, null);  
    })
  }


}





