const logger=require('../../logger'); 
const randomQuote = require ('random-quotes');
const path = require('path');
const fs = require('fs');
const { translateText } = require('../../translator');

exports.test = async (req, res) => {
	try {
			const quote = randomQuote.default().body;
			const author = randomQuote.default().author;
			const to = req.query.to; // Get the target language from the request body

			if (!to) {
				return res.status(200).send({quote: randomQuote.default().body, author: randomQuote.default().author})
			}

			// Translate the quote
			const translatedQuote = await translateText(quote, 'en', to);

			return res.status(200).send({
					quote: translatedQuote,
					author: author
			});
	} catch (error) {
			logger.error(`Error during translation: ${error}`);
			return res.status(500).send({
					error: 'An error occurred during translation.'
			});
	}
};

exports.opstest = async (req, res) => { 
	logger.debug(`OPSBASEURL:${global.config_data.ops.opsBaseUrl} OPSCLIENTID:${global.config_data.ops.opsClientID} OPSCLIENTSECRET:${global.config_data.ops.opsClientSecret}`);
	return res.status(200).send("Check logs");
}

exports.version = async (req, res) => {
	try {
		// Read build number from environment variable
		const buildNumber = process.env.BUILD_NUMBER || 'Unknown';

		// Define the path to the package.json file in the container
	  const packageJsonPath = path.join(__dirname, '../../../package.json');
	  
	  // Read package.json file
	  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
	  // Extract version from package.json
	  const version = packageJson.version;
  
    // Return version and build number information as JSON
    res.json({ version, buildNumber });
	} catch (error) {
	  logger.error(`Error reading package.json:, ${error}`);
	  res.status(500).json({ error: 'Internal Server Error' });
	}
};