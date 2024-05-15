const axios=require('axios');
const logger=require('../logger'); 
const opsDOCURL = global.config_data.ops.opsDocURL;
const opsMonitoring=require('./opsFairUseMonitoring.js');
const rTracer = require('cls-rtracer')

//Authentication Axios instance
let authParams = new URLSearchParams({grant_type : 'client_credentials'});
authParams.append('extraparam', 'value');
const authOptions = {
  baseURL: `${global.config_data.ops.opsBaseUrl}`,
  headers: {
    'Authorization': `Basic ${Buffer.from(global.config_data.ops.opsClientID+":"+global.config_data.ops.opsClientSecret,'utf8').toString('base64')}`,
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
    this.opsMonitoring = new opsMonitoring();
  }

  cacheH = require("../consts/cache").cacheHandler;

  createCommonAxiosInstance(){
    const newAxios = axios.create();
    
    newAxios.interceptors.request.use(
      async config => {
        
        const serviceName = this.opsMonitoring.identifyServiceFromURL(config.url);
        const secondsToWait = this.opsMonitoring.getSecondsToWait(serviceName);
        
        logger.debug(`service: ${serviceName};\
        getAllowedServiceFreq ${this.opsMonitoring.getAllowedServiceFreq(serviceName)};\
        getServiceFreq ${this.opsMonitoring.getServiceFreq(serviceName)};\
        getSecondsToWait ${this.opsMonitoring.getSecondsToWait(serviceName)};\
        getServiceLight ${this.opsMonitoring.getServiceLight(serviceName)};`);
        
        if (secondsToWait > 0) {
          // If there are seconds to wait, delay the execution of the request
          await new Promise(resolve => setTimeout(resolve, secondsToWait * 1000));
        }

        config.baseURL = `${global.config_data.ops.opsBaseUrl}`,
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
      (response) => {
        const serviceName = this.opsMonitoring.identifyServiceFromURL(response.config.url);
        this.opsMonitoring.updateMonitoring(response.headers, serviceName)
        return response 
      },
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

  async publishedDataSearch(strQuery, next) {
    const cachedResult = this.cacheH.nodeCache.get(strQuery);
    if (cachedResult) {
      return next(null, cachedResult.documents, "hit");
    }

    try {
      const result = await this.getAllDocumentsRecurse(strQuery);
      result.documents = this.getFamilyOldests(result.documents);
      // Cache the result with the calculated TTL
      this.cacheH.nodeCache.set(strQuery, { documents: result.documents}, this.cacheH.calculateTTL());

      return next(null, result.documents);
    } catch (err) {
      if (err.response && err?.response?.status === 404) {
        return next(null, []);
      } else {
        return next(err, null);
      }
    }
  }

  
  async getAllDocumentsRecurse(strQuery, pageStart = 1, pageEnd = 100, allDocs = []) {
    try {
      const range = `${pageStart}-${pageEnd}`;
      const queryUrl = `/rest-services/published-data/search/biblio?q=${strQuery}&Range=${range}`;
      // Filter for Kind type, get page range
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

      if (nextPageStart <= patentServiceResponseParsed.opsResultsInfo.total_count && nextPageStart <= global.config_data.ops.opsMaxResults) {
        // Recursively call the function with the next page range
        return this.getAllDocumentsRecurse(strQuery, nextPageStart, nextPageEnd, allDocs);
      }
  
      // Return all documents
      return { documents: allDocs};
    } catch (err) {
      throw err; // Handle errors as needed
    }
  }

  //  aggregate docs with same family and pick the oldest
  //  if the oldest is a "weird" language introduce language priorities:  EP, US, GB, WO, FR, DE, IT and choose another one
  getFamilyOldests(opsPublications) {
    const countryPriority = global.config_data.ops.opsCountryPrio;
    const overridePubPriorityDate = global.config_data.ops.opsDefPubPrioCrit === "country" ? true : false;

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
    const imageDocId = this.adaptDocIdForImageSearch(docid);
    await this.commonAxiosInstance.get(`/rest-services/published-data/publication/epodoc/${imageDocId}/images`)
    .then (async (response) => {
      return next(null, response.data);
    })
    .catch((err) => {
      return next(err, null);  
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

  async getImagesLinksFromDocId(docid, next) {
    const cacheKey = `getImagesLinksFromDocId|${docid}`;
    const cachedResult = this.cacheH.nodeCache.get(cacheKey);
    
    if (cachedResult) {
      return next(cachedResult.imagesLinks, "hit");
    }
    
    try {
      const data = await new Promise((resolve, reject) => {
        this.publishedDataPublicationDocDBImages(docid, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      const imagesLinks = this.parseImagesListBody(data['ops:world-patent-data']['ops:document-inquiry']['ops:inquiry-result']['ops:document-instance']);
      this.cacheH.nodeCache.set(cacheKey, { imagesLinks }, this.cacheH.calculateTTL());
      return next(imagesLinks);
    } catch (err) {
      if (err?.response?.status === 404){
        logger.info(`getImagesLinksFromDocId: images not found for doc ${docid}`);
        logger.debug(`getImagesLinksFromDocId: ${err.message}`);
      }else{
        logger.error(`getImagesLinksFromDocId: ${err.message}.`);
      }
      return next(null);
    }
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

  adaptDocIdForImageSearch(inputString) {
    // Define the list of regular suffixes
    const returnWithoutLastCharSuffixes = ['U1', /* add more regular suffixes as needed */];
  
    // Define the list of suffixes to return as is
    const returnAsIsSuffixes = ['U'];
  
    // Check if the input string ends with one of the suffixes to return as is
    for (const suffix of returnAsIsSuffixes) {
      if (inputString.endsWith(suffix)) {
      return inputString; // Return input string as is
      }
    }
  
    // Check if the input string ends with one of the regular suffixes
    for (const suffix of returnWithoutLastCharSuffixes) {
      if (inputString.endsWith(suffix)) {
      return inputString.slice(0, -1); // Remove the last character and return
      }
    }
  
    // If not ending with any of the specified suffixes, proceed with the original logic
    for (let i = inputString.length - 1; i >= 0; i--) {
      if (/[a-zA-Z]/.test(inputString[i])) {
      // Found the last alphanumeric character, insert a dot before it
      const modifiedString = inputString.slice(0, i) + '.' + inputString.slice(i);
      return modifiedString;
      }
    }
  
    // If no alphanumeric character is found, return the original string
    return inputString;
  }

  setCacheOPSQuota(quotas){
    const cacheHint = 'cached ';
    quotas[0]["x-throttling-control"] = quotas[0]["x-throttling-control"].replace(/^[^(]+/, cacheHint);
    return quotas
  }

  //Set OPS Alert/Quotas in config: 
  //  1. daily & weekly quotas in MBytes
  //  2. treshold percentage for warning (70%) and alert (90%)
  //  3. mail(s) to send warning and alert to
  //  4. mail frequency
  //
  // Parse OPS Header Quotas reply. Differentiate:
  // 1. handle semaphore to introduce a latency between recursive calls
  // 2. handle quota-used to chack against tresholds:
  //    2.1 Send mail in case of warning / Alert
  //
 //https://www.epo.org/en/service-support/ordering/fair-use
  //Downloading data via OPS is free of charge up to a maximum data volume of 4 GB per week ("free threshold"). A week is a calendar week from Monday, 00.00 hrs to Sunday, 24.00 hrs GMT
//
  // Clean:
  // 1. remove previous OPSParse but leave cache hint
  //
  // Cache:
  // Add:
  // 1. Cache for openDoc and Image? 
 
}





