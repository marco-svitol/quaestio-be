module.exports.buildDateRange = function buildDateRange(fromField, toField) {
	var date_regex = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$|^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;
	var fromFieldValid = date_regex.test(fromField);
	var toFieldValid = date_regex.test(toField);
	
	if (fromFieldValid && !toFieldValid) {
			// Transform toField to match the format of fromField
			toField = fromField.replace(/-/g, '');
	} else if (!fromFieldValid && toFieldValid) {
			// Transform fromField to match the format of toField
			fromField = toField.replace(/-/g, '');
	}

	if (fromFieldValid || toFieldValid) {
			return `pd within "${fromField} ${toField}"`;
	}
	
	return null;
}


module.exports.parseOPSErrorXML = function(xmlString){
	// Regular expressions to extract xmlns attribute within the fault element, <code> and <message> values
	const xmlnsPattern = /<fault.*?xmlns="(.*?)"/;
	const codePattern = /<code>(.*?)<\/code>/s;
	const messagePattern = /<message>(.*?)<\/message>/s;

	// Find xmlns attribute using regular expression, <code> and <message> values using regular expressions
	const xmlnsMatch = xmlString.match(xmlnsPattern);
	const codeMatch = xmlString.match(codePattern);
	const messageMatch = xmlString.match(messagePattern);

	// Extract the values
	const xmlnsValue = xmlnsMatch ? xmlnsMatch[1].trim() : null;
	const code = codeMatch ? codeMatch[1].trim() : null;
	const message = messageMatch ? messageMatch[1].trim() : null;
	const containsOpsEpoOrg = xmlnsValue && xmlnsValue.includes("ops.epo.org");
	return ({
			isOPSError: containsOpsEpoOrg, 
			xmlnsValue: xmlnsValue,
			code: code,
			message: message
	});
}

// Function to check if a string variable follows CID pattern
module.exports.isCID = function(str) {
    // Define CID pattern using regular expression
    const cidPattern = /^[A-Za-z0-9]{8}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{12}$/;
    
    // Test if the string matches the pattern
    return cidPattern.test(str);
}