const logger=require('../logger'); 

//helper function for publicationDataFiltered
function findFieldLang(field, lang) {
  const f = field.find(d => d['@lang'] === lang);
  return f || field[0];
}

async function langCheck(field) {
  let fieldBody = field['$'];
  const fieldLang = field['@lang'];
  //const toLang = global.config_data.ops.opsToLang;
  if (global.config_data.ops.opsFriendlyLangs.indexOf(fieldLang) === -1) {
    logger.debug(`Adding _MT flag from ${fieldLang}`);
    fieldBody = `[MT_${fieldLang}_TM]${fieldBody}`;
  }
  field['$'] = fieldBody;
  return field;
}

function normalizeFields(field) {
  let normalizedField = field;
  if (!Array.isArray(field)){
    normalizedField =  [field];
  }
  return normalizedField.map(field => {
      if (field && field['p'] && field['p']['$']) {
          field['$'] = field['p']['$'];
          delete field['p']['$'];
      }
      return field;
    });
}

//TODO: Verify lang priority also here?
// introduce translation here?
// in case we need to have the organization (or user) setting available 
// with the translation matrix
async function publicationDataFilteredAsync(body, lang) {
  const docData = {};
  const docNum = `${body['@country']}${body['@doc-number']}`;

  //Title
  const normalizedTitle = normalizeFields(body['bibliographic-data']['invention-title']);
  langTitle = findFieldLang(normalizedTitle, lang);
  if (global.config_data.ops.opsTranslationEnabled){
    langTitle = await langCheck(langTitle);
  }
  docData.title = langTitle['$'];

  // Date: process 'publication-reference' array and get the 'date' from the first occurrence
  const publicationReferences = normalizeFields(body['bibliographic-data']['publication-reference']['document-id']);
  const firstDocWithDate = publicationReferences.find(doc => doc['date']);
  docData.date = firstDocWithDate ? firstDocWithDate['date']['$'] : '';

  // Date: process 'publication-reference' array and get the 'date' from the first occurrence
  // if (Array.isArray(publicationReferences)) {
  //   const firstDocWithDate = publicationReferences.find(doc => doc['date']);
  //   docData.date = firstDocWithDate ? firstDocWithDate['date']['$'] : '';
  // } else {
  //   docData.date = processField(publicationReferences?.['date'], lang, 'Date is missing');
  // }

  // Abstract: check if 'body['abstract']' exists before attempting to access its properties
  if (body['abstract']) {
    const normalizedAbstract = normalizeFields(body['abstract']);
    langAbstract = findFieldLang(normalizedAbstract, lang);
    if (global.config_data.ops.opsTranslationEnabled && global.config_data.ops.opsTranslateAbstract){
      langAbstract = await langCheck(langAbstract);
    }
    docData.abstract = langAbstract['$'];
  } else {
    docData.abstract = ' -- ';
    logger.verbose(`Abstract is missing for document num: ${docNum}`);
  }

  // Abstract: check if 'body['abstract']' exists before attempting to access its properties
  // if (body['abstract']) {
  //   if (Array.isArray(body['abstract'])) {
  //     const field = filterArrayLang(body['abstract'], lang);
  //     // check lang
  //     fieldBody = field['p']['$'];
  //     const fieldLang = field['@lang'];
  //     const toLang = global.config_data.ops.opsToLang;
  //     if (global.config_data.ops.opsFriendlyLangs.indexOf(fieldLang) === -1){
  //       fieldBody = await translateText(fieldBody, fieldLang, toLang);
  //       fieldBody = `[MT]${fieldBody}`
  //     }
  //     docData.abstract = fieldBody;
  //   } else {
  //     docData.abstract = processField(body['abstract']['p'], lang, 'Abstract is missing');
  //   }
  // } else {
  //   docData.abstract = ' -- ';
  //   logger.verbose(`Abstract is missing for document num: ${docNum}`);
  // }

  // Applicant
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

  // Inventor
  if (
    body['bibliographic-data']['parties'] &&
    body['bibliographic-data']['parties']['inventors'] &&
    body['bibliographic-data']['parties']['inventors']['inventor']
  ) {
    const inventors = body['bibliographic-data']['parties']['inventors'];
    //const filteredInventor = filterArrayLang(inventors['inventor']);
    filteredInventor = normalizeFields(inventors['inventor']);
    const inventorLength = inventors['inventor'].length;
    docData.inventor = filteredInventor[0]['inventor-name']['name']['$'];
    if (inventorLength > 1) {
      docData.inventor += ` (+${inventorLength - 1})`;
    }
  } else {
    docData.inventor = '';
    logger.verbose(`Inventor is missing for document num: ${docNum}`);
  }

  return docData;
}

module.exports = {
  publicationDataFilteredAsync
}