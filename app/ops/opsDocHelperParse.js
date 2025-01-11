//Does multiple things:
// 1. points to the child path
// 2. create array of documents in case document is not an array
// 3. check each document kind and discards all "T" and "D" docs
function filterValidDocuments(documents) {
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

//Parse result to give the total documents and the range
function parseOPSResultsInfo(responseData) {
  const biblioSearch = responseData['ops:world-patent-data']['ops:biblio-search'];
  return {
    total_count: biblioSearch['@total-result-count'],
    range: {
      begin: biblioSearch['ops:range']['@begin'],
      end: biblioSearch['ops:range']['@end']
    }
  };
};

//First parsing of the response from OPS
function parsePatentServiceResponse(response) {
  return {
    opsLights: [response.headers],
    opsResultsInfo: parseOPSResultsInfo(response.data),
    opsPublications: filterValidDocuments(response.data)
  };
}

function parseFamilyIdFromDocId(responseData) {
  // Check if the response is a patent family or an exchange document
  let families = responseData['ops:world-patent-data']?.['ops:patent-family']?.['ops:family-member'];
  if (!families) {
    families = responseData['ops:world-patent-data']['exchange-documents'];
    families = Array.isArray(families) ? families : [families];
    return families[0]['exchange-document']['@family-id'];
  }
  families = Array.isArray(families) ? families : [families];
  return families[0]['@family-id'];
}

module.exports = {
  parsePatentServiceResponse,
  parseFamilyIdFromDocId
}