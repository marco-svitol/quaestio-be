module.exports.insertDotBeforeLastAlphanumeric = function insertDotBeforeLastAlphanumeric(inputString) {
  for (let i = inputString.length - 1; i >= 0; i--) {
    if (/[a-zA-Z]/.test(inputString[i])) {
      // Found the last alphanumeric character, insert a dot before it
      const modifiedString =
        inputString.slice(0, i) + '.' + inputString.slice(i);

      return modifiedString;
    }
  }

  // If no alphanumeric character is found, return the original string
  return inputString;
}

module.exports.validateDate = function validateDate(fromField, toField){
	var date_regex = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|1\d|2\d|3[01])$/;
	fromFieldValid = date_regex.test(fromField);
	toFieldValid = date_regex.test(toField);
	if (fromFieldValid && !toFieldValid){toField = fromField}
	else if (!fromFieldValid && toFieldValid){fromField = toField};
	if (fromFieldValid || toFieldValid){
		return `pd within "${fromField} ${toField}" AND `
	}
	return null
}

//deprecated
function setRange(beginRange, endRange){
	if (beginRange && beginRange != 0){
		return `&Range=${beginRange}-${(+beginRange)+(+endRange)-1}`;
	}else{
		return `&Range=1-100`;
	}
}

function getResultPerPage(){
	return 12;
}