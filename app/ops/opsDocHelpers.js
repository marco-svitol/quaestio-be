const logger=require('../logger'); 
const opsDOCURL = global.config_data.ops.opsDocURL;
const opsDoceHelperParse = require('./opsDocHelperParse');
const opsDoceHelperExtractData = require('./opsDocHelperExtractData');

//Fetch document metadata
function getDocInfo(opsPublication){
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

function getLinkFromDocIdHelper(docNum){
  return `${opsDOCURL}/familyid/publication/${docNum}?q=pn%3D${docNum}`;
}

async function getAllDocumentsRecurse(strQuery, commonAxiosInstance, userInfo, pageStart = 1, pageEnd = 100, allDocs = []) {
  try {
    const range = `${pageStart}-${pageEnd}`;
    const queryUrl = `/rest-services/published-data/search/biblio?q=${strQuery}&Range=${range}`;
    // Filter for Kind type, get page range
    const patentServiceResponseParsed = opsDoceHelperParse.parsePatentServiceResponse(await commonAxiosInstance.get(queryUrl));
    
    logger.debug(`getAllDocumentsRecurse: pageStart=${pageStart}; pageEnd=${pageEnd}; total: ${patentServiceResponseParsed.opsPublications.length}(=${patentServiceResponseParsed.opsResultsInfo.total_count}-${patentServiceResponseParsed.opsResultsInfo.total_count-patentServiceResponseParsed.opsPublications.length})`);
    
    const filteredDocs = [];
    // Iterate through all documents of current range to extract the final data
    for (let opsPublication of patentServiceResponseParsed.opsPublications) {
      opsPublication=opsPublication['exchange-document'];
      const docInfo = getDocInfo(opsPublication);
      const docUrl = getLinkFromDocIdHelper(docInfo["docNum"]);

      const docData = await opsDoceHelperExtractData.publicationDataFilteredAsync(opsPublication, userInfo);

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
      return getAllDocumentsRecurse(strQuery, commonAxiosInstance, userInfo, nextPageStart, nextPageEnd, allDocs);
    }

    // Return all documents
    return { documents: allDocs};
  } catch (err) {
    throw err; // Handle errors as needed
  }
}

//  aggregate docs with same family and pick the oldest
//  if the oldest is a "weird" language introduce language priorities:  EP, US, GB, WO, FR, DE, IT and choose another one
function getFamilyOldests(opsPublications) {
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

    // Both are listed languages and the overridePubPriorityDate is set to False
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

function fetchFamilyIdFromDocId(commonAxiosInstance, docId){
  return new Promise((resolve, reject) => {
    const queryUrl = `/rest-services/family/publication/docdb/${docId}`;
    commonAxiosInstance.get(queryUrl)
    .then(response => {
      const familyId = opsDoceHelperParse.parseFamilyIdFromDocId(response.data);
      resolve(familyId);
    })
    .catch(err => {
      if (err.response.status == 404){
        const queryUrl = `/rest-services/published-data/publication/docdb/${docId}`;
        commonAxiosInstance.get(queryUrl)
        .then(response => {
          const familyId = opsDoceHelperParse.parseFamilyIdFromDocId(response.data);
          resolve(familyId);
        })
        .catch(err => {
          logger.error(`fetchFamilyIdFromDocId: ${err.message}`);
          reject(err);
        });
      }else{
        logger.error(`fetchFamilyIdFromDocId: ${err.message}`);
        reject(err);
      }
    });
  });
}

module.exports = {
  getFamilyOldests,
  getAllDocumentsRecurse,
  getLinkFromDocIdHelper,
  //TODO: temporary until familyId is passed from FE
  fetchFamilyIdFromDocId
}