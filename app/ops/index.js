const axios=require('axios');
const { id } = require('cls-rtracer');
const logger=require('../logger'); 
const opsDOCURL = global.config_data.app.opsDocURL;

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
    this.commonAxiosInstance.get("/rest-services/published-data/search/biblio?q="+strQuery)
    .then(async (response) => {
      //Range! 
      let docs=[];
      let opsLights=[];
      if (response){
        opsLights.push(response.headers);
        if (response.data){
          let opsPublications = response.data['ops:world-patent-data']['ops:biblio-search']['ops:search-result']['exchange-documents'];
          if (!opsPublications.length){
            let singleDoc = opsPublications;
            opsPublications = [];
            opsPublications.push(singleDoc);
          } 
          for (let opsPublication of opsPublications){
            opsPublication=opsPublication['exchange-document'];
            let docid=opsPublication['@country']+'.'+opsPublication['@doc-number']+'.'+opsPublication['@kind'];
            let docUrl= this.getLinkFromDocId(docid);
            //let doctype=opsPublication['@document-id-type'];
            //if (doctype==="docdb"){
              await this.pubblicationDataFiltered(opsPublication, "en", async(err, docData) => {
              if (docData){  
                  docs.push({"doc_num":docid,"type":"docdb","invention_title":docData.title,"date":docData.date,"abstract":docData.abstract,"applicant":docData.applicant,"inventor_name":docData.inventor,"ops_link":docUrl});
                }else{
                  throw (err);
                }
            })
            //}
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

  getLinkFromDocId(docid){
    let docidSplit = docid.split(".");
    return `${opsDOCURL}?FT=D&CC=${docidSplit[0]}&NR=${docidSplit[1]}${docidSplit[2]}&KC=${docidSplit[2]}`;
  }

  async pubblicationDataFiltered(body, lang, next){
    let docData={};

    
    const titles      = body['bibliographic-data']['invention-title']; 
    docData.title = this.filterArrayLang(titles, lang)[0]['$'];

    const dates       = body['bibliographic-data']['publication-reference']['document-id'];
    docData.date      = this.filterArrayLang(dates)[0]['date']['$'];

    const abstracts   = body['abstract'];
    if (abstracts) {
      docData.abstract  = this.filterArrayLang(abstracts,lang)[0]['p']['$'];
    }else{
      docData.abstract  = "";
      logger.debug(`Abstract is missing for document docid: ${docData.title}`);
    }

    const applicants  = body['bibliographic-data']['parties']['applicants']['applicant'];
    docData.applicant = this.filterArrayLang(applicants)[0]['applicant-name']['name']['$'];

    const inventors   =  body['bibliographic-data']['parties']['inventors'];
    if (inventors) {
      const inventorswithlength = this.filterArrayLang(inventors['inventor']);
      docData.inventor  = inventorswithlength[0]['inventor-name']['name']['$'];
      
      if (inventorswithlength[1]){
        docData.inventor += ` (+${inventorswithlength[1]})`;
      }
    }else{
      docData.inventor = "";
      logger.debug(`Inventor is missing for document docid: ${docData.title}`);
    }
    return next(null, docData);
  }

  filterArrayLang(field, lang){
    if (Array.isArray(field)){
      if (lang){
        return [field.filter(d=>d['@lang']==lang)[0], field.length];
      }else{
        return [field[0],field.length];
      }
      }else{
      return [field,null];
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





