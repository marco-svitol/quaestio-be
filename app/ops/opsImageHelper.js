async function publishedDataPublicationDocDBImages(docid, commonAxiosInstance, next){
  const imageDocId = adaptDocIdForImageSearch(docid);
  await commonAxiosInstance.get(`/rest-services/published-data/publication/epodoc/${imageDocId}/images`)
  .then (async (response) => {
    return next(null, response.data);
  })
  .catch((err) => {
    return next(err, null);  
  })
}

function parseImagesListBody(data){
  let imagesLinks=[];
  for (let imageData of data){
    imagesLinks.push({"desc": imageData['@desc'], "nofpages": imageData['@number-of-pages'], "format" : `${pickDocFormat(imageData['ops:document-format-options']['ops:document-format'])}`, "link": imageData['@link']});
  }
  imagesLinks = imagesLinks.sort((a, b) => {
    if (a.desc < b.desc) {
      return -1;
    }
  });
  return (imagesLinks);
}

function pickDocFormat(docFormats){
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

function adaptDocIdForImageSearch(inputString) {
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

module.exports = {
  publishedDataPublicationDocDBImages,
  parseImagesListBody
}