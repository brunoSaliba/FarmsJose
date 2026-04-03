import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import ptBR from './locales/pt-BR/translation.json';

const resources = {
  en: {
    translation: en,
  },
  pt: {
    translation: ptBR,
  },
  'pt-BR': {
    translation: ptBR,
  },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: {
      default: ['pt-BR'],
      pt: ['pt-BR'],
      'pt-BR': ['pt-BR'],
      en: ['en'],
    },
    supportedLngs: ['pt-BR', 'pt', 'en'],
    defaultNS: 'translation',
    ns: ['translation'],
    load: 'all',
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

const applyDocumentLanguage = (language: string) => {
  document.documentElement.lang = language;
};

applyDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;
