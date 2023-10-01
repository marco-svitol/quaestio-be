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
    this.getAllDocuments(strQuery)
      .then(result => {
        result.documents = this.getFamilyOldests(result.documents); // Call getFamilyOldests here
        return next(null, result.documents, result.opsLights);
      })
    .catch(err => {
      if (err.response){
        if (err.response.status === 404){
          return next(null, [], err.response.headers)
        }
      }
      return next(err, null, null);  
    })
  }

  filterKind(docs){
    if (!Array.isArray(docs)) {
      docs = [docs];
    }
    return docs.filter(
        d => d['exchange-document']['@kind'][0] !== 'T' && d['exchange-document']['@kind'][0] !== ['D']
      );
  }

  parsePatentServiceResponse(response){
    return {
      "opsLights":  [response.headers],
      "opsResultsInfo": this.parseOPSResultsInfo(response.data),
      "opsPublications": this.filterKind(response.data['ops:world-patent-data']['ops:biblio-search']['ops:search-result']['exchange-documents'])
    }
  }

  async getAllDocuments(strQuery, pageStart = 1, pageEnd = 100, allDocs = [], lastOpsLights = null) {
    try {
      const range = `${pageStart}-${pageEnd}`;
      const queryUrl = `/rest-services/published-data/search/biblio?q=${strQuery}&Range=${range}`;
      const patentServiceResponseParsed = this.parsePatentServiceResponse(await this.commonAxiosInstance.get(queryUrl));
      
      logger.debug(`getAllDocuments: pageStart=${pageStart}; pageEnd=${pageEnd}; total: ${patentServiceResponseParsed.opsResultsInfo.total_count}`);
      
      const filteredDocs = [];
      for (let opsPublication of patentServiceResponseParsed.opsPublications) {
        opsPublication=opsPublication['exchange-document'];
        const docInfo = this.getDocInfo(opsPublication);
        const docUrl = this.getLinkFromDocId(docInfo["docNum"]);

        const docData = await new Promise((resolve, reject) => {
          this.pubblicationDataFiltered(opsPublication, "en", (err, data) => {
            if (data) {
              resolve(data);
            } else {
              reject(err);
            }
          });
        });

        filteredDocs.push({
          "doc_num": docInfo["docNum"],
          "type": docInfo["docType"],
          "familyid": docInfo["familyid"],
          "country": docInfo["country"],
          "invention_title": docData.title,
          "date": docData.date,
          "abstract": docData.abstract,
          "applicant": docData.applicant,
          "inventor_name": docData.inventor,
          "ops_link": docUrl
        });
      }

      allDocs.push(...filteredDocs);

      // Calculate the next page range
      const nextPageStart = pageEnd + 1;
      const nextPageEnd = pageEnd + 100;

      if (nextPageStart <= patentServiceResponseParsed.opsResultsInfo.total_count) {
        // Recursively call the function with the next page range
        return this.getAllDocuments(strQuery, nextPageStart, nextPageEnd, allDocs, patentServiceResponseParsed.opsLights);
      }
  
      // Return all documents and the opsLights from the last iteration when done
      return { documents: allDocs, opsLights: lastOpsLights || patentServiceResponseParsed.opsLights };
    } catch (err) {
      throw err; // Handle errors as needed
    }
  }

  //  aggregate docs with same family and pick the oldest
              //  if the oldest is a "weird" language introduce language priorities:  EP, US, GB, WO, FR, DE, IT and choose another one
  getFamilyOldests(opsPublications) {
      const countryPriority = ['EP', 'WO', 'US', 'GB', 'DE', 'FR', 'IT'];

      const familyGroups = {};

      opsPublications.forEach(element => {
          const family = element["familyid"];
          const elementDate = element['date'];
          const familyElement = familyGroups[family];

          if (
              !familyElement ||
              countryPriority.indexOf(element['country']) < countryPriority.indexOf(familyElement['country']) ||
              (countryPriority.indexOf(element['country']) === countryPriority.indexOf(familyElement['country']) && elementDate < familyElement['date'])
          ) {
              familyGroups[family] = element;
          }
      });

      const arrayFamilyGroups = Object.values(familyGroups);
      return arrayFamilyGroups;
  }

  getDate(doc){
    const dates = doc['document-id'];
    if (dates) {
      return this.filterArrayLang(dates)[0]['date']['$'];
    }else{
      logger.verbose(`getDate: Date is missing for document docid: xx`);
      return "";
    }
  }

  getDocInfo(opsPublication){
    const docId = opsPublication["bibliographic-data"]["publication-reference"]["document-id"];
    let doc = docId.find(doc =>  doc["@document-id-type"] === "epodoc");
    if (doc){
      return {
        "familyid" : opsPublication["@family-id"],
        "country" : opsPublication["@country"],
        "kind" : opsPublication["@kind"],
        "docNum" : opsPublication["@country"]+opsPublication["@doc-number"]+opsPublication["@kind"],//doc["doc-number"]["$"],
        "docType" : doc["@document-id-type"]
      };
    }
    logger.warn(`getDocNum: epodoc type not found`);
    doc = docId.find(doc =>  doc["@document-id-type"] === "docdb");
    if (doc){
      return {
        "familyid" : opsPublication["@family-id"],
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
      logger.verbose(`Title is missing for document docid: ${docid}`);
    }

    docData.date = "";
    const publicationReferences = body['bibliographic-data']['publication-reference']['document-id'];
    if (publicationReferences) {
      const publicationReferencesFiltered = this.filterArrayLang(publicationReferences,lang)[0];
      if (publicationReferencesFiltered['date']){
        docData.date = publicationReferencesFiltered['date']['$'];
      }else{
        logger.verbose(`Date is missing for document docid: ${docid}`);
      }
    }else{
      logger.verbose(`publication-reference.document-id is missing for document docid: ${docid}`);
    }

    const abstracts   = body['abstract'];
    if (abstracts) {
      docData.abstract  = this.filterArrayLang(abstracts,lang)[0]['p']['$'];
    }else{
      docData.abstract  = "";
      logger.verbose(`Abstract is missing for document docid: ${docid}`);
    }

    const applicants  = body['bibliographic-data']['parties']['applicants']['applicant'];
    if (applicants) {
      docData.applicant = this.filterArrayLang(applicants)[0]['applicant-name']['name']['$'];
    }else{
      docData.applicant  = "";
      logger.verbose(`Applicant is missing for document docid: ${docid}`);
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
      logger.verbose(`Inventor is missing for document docid: ${docid}`);
    }
    return next(null, docData);
  }

  filterArrayLang(field, lang){
    if (Array.isArray(field)){
      if (lang){
        const doc = field.filter(d=>d['@lang']==lang)[0];
        if (doc){ 
          return [doc, field.length];
        }
      }
      return [field[0],field.length];
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
    imagesLinks = imagesLinks.sort((a, b) => {
      if (a.desc < b.desc) {
        return -1;
      }
    });
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





