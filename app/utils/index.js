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
		return `pd within "${fromField} ${toField}" `
	}
	return null
}

module.exports.validateDateBookmark = function validateDate(fromField, toField){
	var date_regex = /^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|1\d|2\d|3[01])$/;
	fromFieldValid = date_regex.test(fromField);
	toFieldValid = date_regex.test(toField);
	if (fromFieldValid && !toFieldValid){toField = fromField}
	else if (!fromFieldValid && toFieldValid){fromField = toField};
	if (fromFieldValid || toFieldValid){
		return ` BETWEEN CONVERT(DATE, CONVERT(VARCHAR(8), ${fromField}), 112) AND CONVERT(DATE, CONVERT(VARCHAR(8), ${toField}), 112);`
	}
	return null
}

module.exports.tokenExpirationDate = function tokenExpirationDate(exp){
	const currentTimestamp = Math.floor(Date.now() / 1000); // Convert to seconds
	const expirationTimestamp = exp;

	const timeRemainingInSeconds = expirationTimestamp - currentTimestamp;

	if (timeRemainingInSeconds > 0) {
		const hours = Math.floor(timeRemainingInSeconds / 3600);
		const minutes = Math.floor((timeRemainingInSeconds % 3600) / 60);
		const seconds = timeRemainingInSeconds % 60;
		return {
			hours: hours,
			minutes: minutes,
			seconds: seconds,
		};
	} else {
		// If the token has already expired, return negative values
		return {
			hours: 0,
			minutes: 0,
			seconds: 0,
		};
	}
}

module.exports.parseOPSQuota = function(headers){
	let throttling = headers["x-throttling-control"].replace(',','').replace('(','').replace(')','').split(' ');
	throttling = throttling.map(x => {return x.split('=')});
	let quotas = ({"throttling-control": throttling, "individualquotaperhour-used": headers["x-individualquotaperhour-used"], "registeredquotaperweek-used": headers["x-registeredquotaperweek-used"]});
	return quotas;
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