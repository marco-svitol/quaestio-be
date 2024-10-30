const logger = require('../logger');
const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');
let key = global.config_data.translator.azureTranslatorKey;
let endpoint = global.config_data.translator.azureTranslatorEndpoint;
let location = global.config_data.translator.azureTranslatorLocation;

// Static axios instance
const axiosInstance = axios.create({
    baseURL: endpoint,
    headers: {
        'Ocp-Apim-Subscription-Key': key,
        // location required if you're using a multi-service or regional (not global) resource.
        'Ocp-Apim-Subscription-Region': location,
        'Content-type': 'application/json',
        'X-ClientTraceId': uuidv4().toString()
    },
    responseType: 'json'
});

async function translateText(text, from, to) {
    try {
        let response = await axiosInstance.post('/translate', [{
            'text': text
        }], {
            params: {
                'api-version': '3.0',
                //'from': from,
                'to': to
            }
        });
        return response.data[0].translations[0].text;
    } catch (error) {
        logger.error(`Error translating text: ${error}`);
        throw error;
    }
}

module.exports = {
  translateText
};
