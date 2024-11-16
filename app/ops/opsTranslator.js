const logger=require('../logger'); 
const { translateText } = require('../translator');

class OpsTranslator {
  constructor(config) {
    this.machineTranslatedMark = config.translator.machineTranslatedMark
    this.langPrefix = config.ops.opsTranslateMarkPrefix;
    this.langSuffix = config.ops.opsTranslateMarkSuffix;
  }

  async translateDocs(opsPublications, userInfo) {
    if (userInfo.pattodate_translationEnabled){
      const toLang = userInfo.pattodate_toLang;
      const translatedPublications = await Promise.all(opsPublications.map(async element => {
        element['invention_title'] = await this.translateField(element['invention_title'], 'title', toLang);
        element['abstract'] = await this.translateField(element['abstract'], 'abstract', toLang);
        return element;
      }));
      return translatedPublications;
    }else{
      return opsPublications;
    }
  }

  async translateField(text, fieldName, toLang) {
    const startIndex = text.indexOf(this.langPrefix) + this.langPrefix.length;
    const endIndex = text.indexOf(this.langSuffix);
    if (startIndex > -1 && endIndex > -1 && startIndex < endIndex) {
      const langFrom = text.substring(startIndex, endIndex);
      logger.debug(`translate: translating ${fieldName} from ${langFrom} to ${toLang}`);
      const translatedText = await translateText(text.substring(endIndex + this.langSuffix.length), langFrom, toLang);
      return `${this.machineTranslatedMark}${translatedText}`;
    }
    return text;
  }

  async titleLangCheck(langTitle, userInfo){
    if (userInfo.pattodate_translationEnabled){
      langTitle = await this.langCheck(langTitle, userInfo);
    }
    return langTitle;
  }

  async abstractLangCheck(langAbstract, userInfo){
    if (userInfo.pattodate_translationEnabled && userInfo.pattodate_translateAbstract){
      langAbstract = await this.langCheck(langAbstract, userInfo);
    }
    return langAbstract;
  }

  async langCheck(field, userInfo) {
    let fieldBody = field['$'];
    const fieldLang = field['@lang'];
    if (userInfo.pattodate_friendlyLangs.indexOf(fieldLang) === -1) {
      logger.debug(`Flagging field for translation from ${fieldLang}`);
      fieldBody = `${this.langPrefix}${fieldLang}${this.langSuffix}${fieldBody}`;
    }
    field['$'] = fieldBody;
    return field;
  }
}

const opsTranslatorInstance = new OpsTranslator(global.config_data);
module.exports = opsTranslatorInstance;