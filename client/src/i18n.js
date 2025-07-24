import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const supportedLngs = ['en', 'bn', 'gu', 'hi', 'kn', 'ml', 'mr', 'pa', 'ta', 'te'];

const ns = ['aiAssistant', 'auth', 'common', 'dashboard', 'profile', 'settings', 'tripDetails'];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true,
    supportedLngs: supportedLngs,
    ns: ns,
    defaultNS: 'common', 
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false, 
    },
  });

export default i18n;