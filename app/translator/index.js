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
        from = validateLanguageCode(from);
        let response = await axiosInstance.post('/translate', [{
            'text': text
        }], {
            params: {
                'api-version': '3.0',
                'from': from,
                'to': to
            }
        });
        return response.data[0].translations[0].text;
    } catch (error) {
        logger.error(`Error translating text: ${error}`);
        throw error;
    }
}

const languageCodeMap = {
    'ol': 'ko', // Example mapping
    // Add more mappings as needed
};

// List of valid Azure language codes
const validLanguageCodes = [
    'af', 'sq', 'am', 'ar', 'hy', 'as', 'az', 'bn', 'ba', 'eu', 'bho', 'brx', 'bs', 'bg', 'yue', 'ca', 'lzh', 'zh-Hans', 'zh-Hant',
    'sn', 'hr', 'cs', 'da', 'prs', 'dv', 'doi', 'nl', 'en', 'et', 'fo', 'fj', 'fil', 'fi', 'fr', 'fr-ca', 'gl', 'ka', 'de', 'el',
    'gu', 'ht', 'ha', 'he', 'hi', 'mww', 'hu', 'is', 'ig', 'id', 'ikt', 'iu', 'iu-Latn', 'ga', 'it', 'ja', 'kn', 'ks', 'kk', 'km',
    'rw', 'tlh-Latn', 'tlh-Piqd', 'gom', 'ko', 'ku', 'kmr', 'ky', 'lo', 'lv', 'lt', 'ln', 'dsb', 'lug', 'mk', 'mai', 'mg', 'ms', 'ml',
    'mt', 'mi', 'mr', 'mn-Cyrl', 'mn-Mong', 'my', 'ne', 'nb', 'nya', 'or', 'ps', 'fa', 'pl', 'pt', 'pt-pt', 'pa', 'otq', 'ro', 'run',
    'ru', 'sm', 'sr-Cyrl', 'sr-Latn', 'st', 'nso', 'si', 'sk', 'sl', 'so', 'es', 'sw', 'sv', 'ta', 'te', 'th', 'ti', 'ts', 'tn', 'tr',
    'tk', 'uk', 'ur', 'ug', 'uz', 'vi', 'cy', 'xh', 'yi', 'yo', 'zu'
  ];

// Function to validate and convert language codes
function validateLanguageCode(langCode) {
    // Convert non-standard code to standard code if mapping exists
    if (languageCodeMap[langCode]) {
        return languageCodeMap[langCode];
    }
    // Check if the code is valid
    if (validLanguageCodes.includes(langCode)) {
        return langCode;
    }
    // If invalid, return an empty string to trigger auto-detection
    return '';
}


module.exports = {
  translateText
};
