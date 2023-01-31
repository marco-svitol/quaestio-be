const axios=require('axios');
const { id } = require('cls-rtracer');
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
      if (response){
        opsLights.push(response.headers);
        if (response.data){
          let opsPublications = response.data['ops:world-patent-data']['ops:biblio-search']['ops:search-result']['ops:publication-reference'];
          if (!opsPublications.length){
            let singleDoc = opsPublications;
            opsPublications = [];
            opsPublications.push(singleDoc);
          } 
          for (const opsPublication of opsPublications){
            let docid=opsPublication['document-id']['country']['$']+'.'+opsPublication['document-id']['doc-number']['$']+'.'+opsPublication['document-id']['kind']['$'];
            let docUrl=`https://worldwide.espacenet.com/publicationDetails/biblio?FT=D&CC=${opsPublication['document-id']['country']['$']}&NR=${opsPublication['document-id']['doc-number']['$']}${opsPublication['document-id']['kind']['$']}&KC=${opsPublication['document-id']['kind']['$']}`;
            let doctype=opsPublication['document-id']['@document-id-type'];
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
        }
      }
      return next(null, docs, opsLights);
      //Semaphors + quota
    })
    .catch((err) => {
      if (err.response){
        if (err.response.status === 404){
          return next(null, [], err.response.headers)
        }
      }
      return next(err, null, null);  
    })
  }

  async pubblicationDataFiltered(docid, lang, next){
    await this.publishedDataPubblicationDocDB(docid, async (err, body, headers) => {
      if (!err){
        let docData={};

        const titles      = body['ops:world-patent-data']['exchange-documents']['exchange-document']['bibliographic-data']['invention-title']; 
        docData.title = this.filterArrayLang(titles, lang)['$'];

        const dates       = body['ops:world-patent-data']['exchange-documents']['exchange-document']['bibliographic-data']['publication-reference']['document-id'];
        docData.date      = this.filterArrayLang(dates)['date']['$'];
        
        const abstracts   = body['ops:world-patent-data']['exchange-documents']['exchange-document']['abstract'];
        docData.abstract  = this.filterArrayLang(abstracts,lang)['p']['$'];
        
        const applicants  = body['ops:world-patent-data']['exchange-documents']['exchange-document']['bibliographic-data']['parties']['applicants']['applicant'];
        docData.applicant = this.filterArrayLang(applicants)['applicant-name']['name']['$'];
        
        const inventors   =  body['ops:world-patent-data']['exchange-documents']['exchange-document']['bibliographic-data']['parties']['inventors']['inventor'];
        docData.inventor  = this.filterArrayLang(inventors)['inventor-name']['name']['$'];
        
        return next(null, docData, headers);
      }else{
        return (err)
      }
    })
  }

  filterArrayLang(field, lang){
    if (Array.isArray(field)){
      if (lang){
        return (field.filter(d=>d['@lang']==lang)[0]);
      }else{
        return (field[0]);
      }
      }else{
      return (field);
    }
  }

  async publishedDataPubblicationDocDB(strQuery, next){
    try{
      const response = await this.commonAxiosInstance.get(`/rest-services/published-data/publication/docdb/${strQuery}/`)
      return next(null, response.data, response.headers);
    }
    catch(err){
      return next(err, null, null);  
    }
  }
}





