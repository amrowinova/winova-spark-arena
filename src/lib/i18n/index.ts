import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ar, en, fr, de, nl, tr, fa, ur, it, es } from './locales';

const resources = {
  ar: ar,
  en: en,
  fr: fr,
  de: de,
  nl: nl,
  tr: tr,
  fa: fa,
  ur: ur,
  it: it,
  es: es,
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('winova-language') || 'ar',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
