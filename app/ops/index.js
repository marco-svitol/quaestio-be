const axios=require('axios');
const logger=require('../logger'); 
const opsDOCURL = global.config_data.app.opsDocURL;
const utils=require('../utils');

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

  cacheH = require("../consts/cache").cacheHandler;

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
          logger.debug(`Axios: ${error.code} : ${error.response.data}`);
          if ((!authResponse.access_token || [400,401,403].includes(statuscode)) && !originalRequest._retry ){
            originalRequest._retry = true;
            await refreshToken();
            logger.debug (`Successfully acquired token from OPS, will expire in approximately ${(authResponse.expires_in/60).toFixed(2)} minutes`);
            return newAxios(originalRequest); 
          }
        }
        return Promise.reject(error);
      }
    )
    // newAxios.interceptors.response.use(
    //   (response) => {return response},
    //   async (error) => {
    //       const terror = {
    //         "code" : "ERR_BAD_REQUEST",
    //         "response" : {
    //           "status" : 403,
    //           "data" : "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n<fault xmlns=\"http://ops.epo.org\">\n    <code>CLIENT.RobotDetected</code>\n    <message>Recent behaviour implies you are a robot. The server is at the moment too busy to serve robots. Please try again later</message>\n</fault>",
    //         },
    //         "message" : "Request failed with status code 403",
    //         "stack" : "this is the stack"
    //         };
    //       logger.debug(`Axios: ${terror.code} : ${terror.response.data}`);
    //     return Promise.reject(terror);
    //   }
    // )
    return newAxios;
  }

  async publishedDataSearchNoCache(strQuery, next){
    this.getAllDocumentsRecurse(strQuery)
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

  async publishedDataSearch(strQuery, next) {
    const cachedResult = this.cacheH.nodeCache.get(strQuery);
    if (cachedResult) {
      return next(null, cachedResult.documents, cachedResult.opsLights);
    }

    try {
      const result = await this.getAllDocumentsRecurse(strQuery);
      result.documents = this.getFamilyOldests(result.documents);

      // Deep copy of result.opsLights
      const cacheLabeledOPSLights = utils.setCacheOPSQuota(JSON.parse(JSON.stringify(result.opsLights))); 
      // Cache the result with the calculated TTL
      this.cacheH.nodeCache.set(strQuery, { documents: result.documents, opsLights: cacheLabeledOPSLights }, this.cacheH.calculateTTL());

      return next(null, result.documents, result.opsLights);
    } catch (err) {
      if (err.response && err?.response?.status === 404) {
        return next(null, [], err.response.headers);
      } else {
        return next(err, null, null);
      }
    }
  }

  
  async getAllDocumentsRecurse(strQuery, pageStart = 1, pageEnd = 100, allDocs = [], lastOpsLights = null) {
    try {
      const range = `${pageStart}-${pageEnd}`;
      const queryUrl = `/rest-services/published-data/search/biblio?q=${strQuery}&Range=${range}`;
      // Filter for Kind type, get page range, get response headers for Lights
      const patentServiceResponseParsed = this.parsePatentServiceResponse(await this.commonAxiosInstance.get(queryUrl));
      
      logger.debug(`getAllDocumentsRecurse: pageStart=${pageStart}; pageEnd=${pageEnd}; total: ${patentServiceResponseParsed.opsPublications.length}(=${patentServiceResponseParsed.opsResultsInfo.total_count}-${patentServiceResponseParsed.opsResultsInfo.total_count-patentServiceResponseParsed.opsPublications.length})`);
      
      const filteredDocs = [];
      for (let opsPublication of patentServiceResponseParsed.opsPublications) {
        opsPublication=opsPublication['exchange-document'];
        const docInfo = this.getDocInfo(opsPublication);
        const docUrl = this.getLinkFromDocId(docInfo["docNum"]);

        const docData = await new Promise((resolve, reject) => {
          this.publicationDataFiltered(opsPublication, "en", (err, data) => {
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

      if (nextPageStart <= patentServiceResponseParsed.opsResultsInfo.total_count && nextPageStart <= global.config_data.app.maxOPSResults) {
        // Recursively call the function with the next page range
        return this.getAllDocumentsRecurse(strQuery, nextPageStart, nextPageEnd, allDocs, patentServiceResponseParsed.opsLights);
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
    const countryPriority = global.config_data.app.countryPrio;
    const overridePubPriorityDate = global.config_data.app.defPubPrioCrit === "country" ? true : false;

    const families = {};

    opsPublications.forEach(element => {
      const familyId = element["familyid"];
      const elementDate = element['date'];
      const promotedFamilyElement = families[familyId];
      // if no promoted element exists yet, add it
      if (!promotedFamilyElement){
        families[familyId] = element;
        return;
      }

      const promotedCountryPriority = countryPriority.indexOf(promotedFamilyElement['country']);
      const promotedIsInCountryPriority = promotedCountryPriority >= 0 ? true : false;
      const elementCountryPriority = countryPriority.indexOf(element['country']);
      const elementIsInCountryPriority = elementCountryPriority >= 0 ? true : false;
      
      // Element is in language priority and promoted element was not a listed language always wins
      if (elementIsInCountryPriority && !promotedIsInCountryPriority){
        families[familyId] = element;
        return;
      }
      // Both are not listed languages, older wins
      if ((!elementIsInCountryPriority && !promotedIsInCountryPriority) && (elementCountryPriority === promotedCountryPriority)){
        if (elementDate < promotedFamilyElement['date']){
          families[familyId] = element;
          return;
        }
      }
      // Both are listed languages and have the same language priority: the older wins
      if ((elementIsInCountryPriority && promotedIsInCountryPriority) && (elementCountryPriority === promotedCountryPriority)){
        if (elementDate < promotedFamilyElement['date']){
          families[familyId] = element;
          return;
        }
      }

      // Both are listed languages and the overridePubPriorityDate is set to True
      // then compare the priorities and ignore the date
      if ((elementIsInCountryPriority && promotedIsInCountryPriority) && overridePubPriorityDate){
        if (elementCountryPriority > promotedCountryPriority){
          families[familyId] = element;
          return;
        }
      }

      // Both are not listed languages and the overridePubPriorityDate is set to False
      //  then older always wins regardless of the date 
      if ((elementIsInCountryPriority && promotedIsInCountryPriority) && !overridePubPriorityDate){
        if (elementDate < promotedFamilyElement['date']){
          families[familyId] = element;
          return;
        }
      }

    });

    const arrayFamilies = Object.values(families);
    return arrayFamilies;
  }

  parsePatentServiceResponse(response) {
    const filterValidDocuments = (documents) => {
      const exchangeDocument = documents['ops:world-patent-data']['ops:biblio-search']['ops:search-result']?.['exchange-documents'];
      const filteredDocs = Array.isArray(exchangeDocument) ? exchangeDocument : [exchangeDocument];
      return filteredDocs.filter(
        doc => {
          if(doc['exchange-document']['@kind']){
            if(doc['exchange-document']['@kind'].length > 0){
              return doc['exchange-document']['@kind'][0] !== 'T' && doc['exchange-document']['@kind'][0] !== 'D'
            }
          }
          return false;
        }
      )
    };
  
    const parseOPSResultsInfo = (responseData) => {
      const biblioSearch = responseData['ops:world-patent-data']['ops:biblio-search'];
      return {
        total_count: biblioSearch['@total-result-count'],
        range: {
          begin: biblioSearch['ops:range']['@begin'],
          end: biblioSearch['ops:range']['@end']
        }
      };
    };
  
    return {
      opsLights: [response.headers],
      opsResultsInfo: parseOPSResultsInfo(response.data),
      opsPublications: filterValidDocuments(response.data)
    };
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
        "docNum" : opsPublication["@country"]+opsPublication["@doc-number"]+opsPublication["@kind"],
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

  getLinkFromDocId(docNum){
    return `${opsDOCURL}/familyid/publication/${docNum}?q=pn%3D${docNum}`;
  }


  async publicationDataFiltered(body, lang, next) {
    const filterArrayLang = (field, lang) => {
      if (Array.isArray(field)) {
        const filteredDoc = lang ? field.find(d => d['@lang'] === lang) : field[0];
        return filteredDoc;
      } else {
        return field;
      }
    };
  
    const docData = {};
    const docNum = body['@country']+body['@doc-number'];
  
    const processField = (field, logMessage) => {
      const filteredData = filterArrayLang(field, lang);
      if (filteredData) {
        return filteredData['$'];
      } else {
        logger.verbose(`${logMessage} for document num: ${docNum}`);
        return ' -- ';
      }
    };
  
    docData.title = processField(body['bibliographic-data']['invention-title'], 'Title is missing');
    // Process 'publication-reference' array and get the 'date' from the first occurrence
    const publicationReferences = body['bibliographic-data']['publication-reference']['document-id'];

    if (Array.isArray(publicationReferences)) {
      const firstDocWithDate = publicationReferences.find(doc => doc['date']);
      docData.date = firstDocWithDate ? firstDocWithDate['date']['$'] : '';
    } else {
      docData.date = processField(publicationReferences?.['date'], 'Date is missing');
    }
  
    // Check if 'body['abstract']' exists before attempting to access its properties
    if (body['abstract']) {
      if (Array.isArray(body['abstract'])) {
        const field = filterArrayLang(body['abstract'], lang);
        docData.abstract = field['p']['$'];
      } else {
        docData.abstract = processField(body['abstract']['p'], 'Abstract is missing');
      }
    } else {
      docData.abstract = ' -- ';
      logger.verbose(`Abstract is missing for document num: ${docNum}`);
    }
    
    if (
      body['bibliographic-data']['parties'] &&
      body['bibliographic-data']['parties']['applicants'] &&
      body['bibliographic-data']['parties']['applicants']['applicant']
    ) {
      // Ensure that 'applicant' is an array
      body['bibliographic-data']['parties']['applicants']['applicant'] = Array.isArray(body['bibliographic-data']['parties']['applicants']['applicant'])
      ? body['bibliographic-data']['parties']['applicants']['applicant']
      : [body['bibliographic-data']['parties']['applicants']['applicant']];
      // Filter items based on the condition
      docData.applicant = body['bibliographic-data']['parties']['applicants']['applicant']
        .filter(applicant => applicant['@data-format'] === 'epodoc')
        .map(applicant => applicant['applicant-name']['name']['$'])
        .join(', ');
    } else {
      docData.applicant = '';
      logger.verbose(`Applicant is missing for document num: ${docNum}`);
    }

  
    if (
      body['bibliographic-data']['parties'] &&
      body['bibliographic-data']['parties']['inventors'] &&
      body['bibliographic-data']['parties']['inventors']['inventor']
    ) {
      const inventors = body['bibliographic-data']['parties']['inventors'];
      const filteredInventor = filterArrayLang(inventors['inventor']);
      const inventorLength = inventors['inventor'].length;
      docData.inventor = filteredInventor['inventor-name']['name']['$'];
      if (inventorLength > 1) {
        docData.inventor += ` (+${inventorLength - 1})`;
      }
    } else {
      docData.inventor = '';
      logger.verbose(`Inventor is missing for document num: ${docNum}`);
    }
  
    return next(null, docData);
  }
  


  async publishedDataPublicationDocDBImages(docid, next){
    const imageDocId = utils.adaptDocIdForImageSearch(docid);
    await this.commonAxiosInstance.get(`/rest-services/published-data/publication/epodoc/${imageDocId}/images`)
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





