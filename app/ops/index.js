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
            Accept : 'application/json, application/pdf, application/jpeg, application/gif, image/png'
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
      let docs=[];
      let opsLights=[];
      let opsResultsInfo = null;
      if (response){
        opsLights.push(response.headers);
        opsResultsInfo = this.parseOPSResultsInfo(response.data);
        if (response.data){
          let opsPublications = response.data['ops:world-patent-data']['ops:biblio-search']['ops:search-result']['exchange-documents'];
          if (!opsPublications.length){
            let singleDoc = opsPublications;
            opsPublications = [];
            opsPublications.push(singleDoc);
          } 
          for (let opsPublication of opsPublications){
            opsPublication=opsPublication['exchange-document'];
            const docInfo = this.getDocInfo(opsPublication);
            let docUrl= this.getLinkFromDocId(docInfo["docNum"]);
              await this.pubblicationDataFiltered(opsPublication, "en", async(err, docData) => {
              if (docData){  
                  docs.push({"doc_num":docInfo["docNum"],"type":docInfo["docType"],"familyid":docInfo["familyid"],"invention_title":docData.title,"date":docData.date,"abstract":docData.abstract,"applicant":docData.applicant,"inventor_name":docData.inventor,"ops_link":docUrl});
                }else{
                  throw (err);
                }
            })
            //}
          };
        }
      }
      return next(null, docs, opsLights, opsResultsInfo);
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

  getDocInfo(opsPublication){
    const docId = opsPublication["bibliographic-data"]["publication-reference"]["document-id"];
    let doc = docId.find(doc =>  doc["@document-id-type"] === "epodoc");
    if (doc){
      return {
        "familyid" : doc["@family-id"],
        "country" : doc["@country"],
        "kind" : doc["@kind"],
        "docNum" : doc["doc-number"]["$"],
        "docType" : doc["@document-id-type"]
      };
    }
    logger.warn(`getDocNum: epodoc type not found`);
    doc = docId.find(doc =>  doc["@document-id-type"] === "docdb");
    if (doc){
      return {
        "familyid" : doc["@family-id"],
        "country" : doc["@country"],
        "kind" : doc["@kind"],
        "docNum" : doc["country"]["$"].doc["doc-number"]["$"].doc["kind"]["$"],
        "docType" : doc["@document-id-type"]
      };
    }
  } 

  parseOPSResultsInfo(responseData){
    return {
      "total_count": responseData['ops:world-patent-data']['ops:biblio-search']['@total-result-count'],
      "range": {
          "begin": responseData['ops:world-patent-data']['ops:biblio-search']['ops:range']['@begin'],
          "end": responseData['ops:world-patent-data']['ops:biblio-search']['ops:range']['@end']
      }
    };
  }

  getLinkFromDocId(docNum){
    return `${opsDOCURL}/familyid/publication/${docNum}?q=pn%3D${docNum}`;
  }

  async pubblicationDataFiltered(body, lang, next){
    let docData={};
    const docid = body['bibliographic-data']['application-reference']['@doc-id']; 
    
    const titles      = body['bibliographic-data']['invention-title']; 
    if (titles) {
      docData.title = this.filterArrayLang(titles, lang)[0]['$'];
    }else{
      docData.title = "";
      logger.debug(`Title is missing for document docid: ${docid}`);
    }

    const dates       = body['bibliographic-data']['publication-reference']['document-id'];
    if (dates) {
      docData.date      = this.filterArrayLang(dates)[0]['date']['$'];
    }else{
      docData.date = "";
      logger.debug(`Date is missing for document docid: ${docid}`);
    }

    const abstracts   = body['abstract'];
    if (abstracts) {
      docData.abstract  = this.filterArrayLang(abstracts,lang)[0]['p']['$'];
    }else{
      docData.abstract  = "";
      logger.debug(`Abstract is missing for document docid: ${docid}`);
    }

    const applicants  = body['bibliographic-data']['parties']['applicants']['applicant'];
    if (applicants) {
      docData.applicant = this.filterArrayLang(applicants)[0]['applicant-name']['name']['$'];
    }else{
      docData.applicant  = "";
      logger.debug(`Applicant is missing for document docid: ${docid}`);
    }
    

    const inventors   =  body['bibliographic-data']['parties']['inventors'];
    if (inventors) {
      const inventorswithlength = this.filterArrayLang(inventors['inventor']);
      docData.inventor  = inventorswithlength[0]['inventor-name']['name']['$'];
      
      if (inventorswithlength[1]){
        docData.inventor += ` (+${inventorswithlength[1]})`;
      }
    }else{
      docData.inventor = "";
      logger.debug(`Inventor is missing for document docid: ${docid}`);
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

  async publishedDataPublicationDocDBImages(docid, next){
    await this.commonAxiosInstance.get(`/rest-services/published-data/publication/epodoc/${docid}/images`)
    .then (async (response) => {
      return next(null, response.data, response.headers);
    })
    .catch((err) => {
      return next(err, null, null);  
    })
  }

  parseImagesListBody(data){
    let imagesLinks=[];
    for (let imageData of data){
      imagesLinks.push({"desc": imageData['@desc'], "nofpages": imageData['@number-of-pages'], "format" : `${this.pickDocFormat(imageData['ops:document-format-options']['ops:document-format'])}`, "link": imageData['@link']});
    }
    return (imagesLinks);
  }

  pickDocFormat(docFormats){
    const formatsPriority = [
      'png',
      'pdf',
      'jpg',
      'tiff'
    ]
    for (let format of formatsPriority){
      if (docFormats.find(({$}) => $.includes(format))){
        return format
      }
    }
    return docFormats[0][$];
  }

  getImagesLinksFromDocId(docid, next){
    //call ops to list of images
    this.publishedDataPublicationDocDBImages(docid, (err, data, headers) => {
      if (!err) {
        try {
          const imagesLinks = this.parseImagesListBody(data['ops:world-patent-data']['ops:document-inquiry']['ops:inquiry-result']['ops:document-instance']);
          return next ({imagesLinks: imagesLinks, headers: headers});
        }
        catch(err){
          logger.error(`getImagesLinksFromDocId: ${err.message}. Stack: ${err.stack}`);
          return next(null);
        }
      }else{
        logger.error(`getImagesLinksFromDocId: ${err.message}. Stack: ${err.stack}`);
        return next(null);
      }
    })
  }

  async getImage(imgPath, imgFormat, imgPage, next){
    try{
      const getURL = `/rest-services/${imgPath}.${imgFormat}?Range=${imgPage}`;
      logger.verbose(`image: ${getURL}`);
      const response = await this.commonAxiosInstance.get(`${getURL}`, {responseType: 'stream'});
      return next(null, response.data, response.headers);
    }
    catch(err){
      return next(err, null, null);  
    }
  }

}





