const axios=require('axios');
const logger=require('../logger'); 
const opsMonitoring=require('./opsFairUseMonitoring.js');
const opsDocHelper = require('./opsDocHelpers.js');
const opsImageHelper = require('./opsImageHelper.js');
const opsTranslatorInstance = require('./opsTranslator');
const { DOMParser } = require('@xmldom/xmldom')

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
getSystemState ${this.opsMonitoring.getSystemState()};\
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
        // logger.debug(`Axios: response.headers: ${response.headers}`);
        this.opsMonitoring.updateMonitoring(response.headers, serviceName)
        return response 
      },
      async (error) => {
        if (error.response && error.config) {
          const statuscode = error.response.status;
          const originalRequest = error.config;
          if ((!authResponse.access_token || [400,401,403].includes(statuscode)) && !originalRequest._retry ){
            originalRequest._retry = true;
            await refreshToken();
            logger.debug (`Successfully acquired token from OPS, will expire in approximately ${(authResponse.expires_in/60).toFixed(2)} minutes`);
            return newAxios(originalRequest); 
          } else if (error.response.headers['x-api'] && error.response.headers['x-api'].startsWith('ops')) {
            const { errorCode, errorMessage } = this.parseErrorResponse(error);
            const serviceName = this.opsMonitoring.identifyServiceFromURL(error.response.config.url);
            this.opsMonitoring.updateMonitoring(error.response.headers, serviceName)
            switch (errorCode) {
              case "SERVER.EntityNotFound":
              return null;
              // case "CLIENT.RobotDetected":
              //   break;
              // case "CLIENT.MaximumTotalTerms":
              //   break;
              // default:
              //   
            }
          }
        }
        return Promise.reject(error);
      }
    )
    return newAxios;
  }

  parseErrorResponse(error) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(error.response.data, "text/xml");
    const errorCode = xmlDoc.getElementsByTagName("code")[0].childNodes[0].nodeValue;
    const errorMessage = xmlDoc.getElementsByTagName("message")[0].childNodes[0].nodeValue;
    return { errorCode, errorMessage };
  }

  async publishedDataSearch(strQuery, userInfo, next) {
    
    const cachedResult = this.cacheH.getCacheDocSearch(strQuery);
    if (cachedResult) {
      return next(null, cachedResult.documents, true);
    }
  
    let result ={ documents: [] };
    try {
      result = await opsDocHelper.getAllDocumentsRecurse(strQuery, this.commonAxiosInstance, userInfo);
      result.documents = opsDocHelper.getFamilyOldests(result.documents);
      result.documents = await opsTranslatorInstance.translateDocs(result.documents, userInfo)
    } catch (err) {
      const { errorCode, errorMessage } = this.parseErrorResponse(err);
      switch (errorCode) {
        case "CLIENT.RobotDetected":
          logger.error(`Axios: OPS replied that a Robot was detected and sent this message: ${errorMessage}`);
          err.handled = true;
          err.message = errorMessage;
          break;
        case "CLIENT.MaximumTotalTerms":
          logger.error(`Axios: OPS replied that the query has too many terms and sent this message: ${errorMessage}`);
          err.handled = true;
          err.message = errorMessage;
          break;
        default:
          logger.debug(`Axios: OPS sent this error code: ${errorCode} with this message: ${errorMessage}`);
      }
      return next(err, null);
    }
    // Cache the result
    this.cacheH.setCacheDocSearch(strQuery, { documents: result.documents});
    return next(null, result.documents);
  }

  getLinkFromDocId(docNum){
    return opsDocHelper.getLinkFromDocIdHelper(docNum);
  }

  async getImagesLinksFromDocId(docid, next) {
    
    const cachedResult = this.cacheH.getCacheImageLink(docid);
    if (cachedResult) {
      return next(cachedResult.imagesLinks, true);
    }
    
    try {
      const data = await new Promise((resolve, reject) => {
        opsImageHelper.publishedDataPublicationDocDBImages(docid, this.commonAxiosInstance, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      const imagesLinks = opsImageHelper.parseImagesListBody(data['ops:world-patent-data']['ops:document-inquiry']['ops:inquiry-result']['ops:document-instance']);
      this.cacheH.setCacheImageLink(docid, { imagesLinks });
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





