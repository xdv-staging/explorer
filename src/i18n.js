import i18n from 'i18next';
import languageDetector from './languageDetector';
import './locales/en-US/translations.json';

const backendOptions = {
  type: 'backend',
  read(language, namespace, callback) {
    import(`./locales/${language}.json`)
      .then(resources => {
        callback(null, resources[namespace]);
      })
      .catch(error => {
        callback(error, null);
      });
  }
};

const options = {
  debug: process.env.NODE_ENV === 'development',
  fallbackLng: 'en-US',
  ns: ['translations'], // have a common namespace used around the full app
  defaultNS: 'translations',
  keySeparator: false, // we use content as keys
  interpolation: {
    escapeValue: false, // not needed for react!!
    formatSeparator: ','
  },
  react: {
    wait: true
  },
  load: 'currentOnly'
};

i18n
  .use(backendOptions)
  .use(languageDetector)
  .init(options);

export default i18n;
