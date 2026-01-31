import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export type Language = 'ar' | 'en' | 'fr' | 'de' | 'nl' | 'tr' | 'fa' | 'es';
type Direction = 'ltr' | 'rtl';

export interface LanguageOption {
  code: Language;
  nameEn: string;
  nameNative: string;
  direction: Direction;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'ar', nameEn: 'Arabic', nameNative: 'العربية', direction: 'rtl', flag: '🇸🇦' },
  { code: 'en', nameEn: 'English', nameNative: 'English', direction: 'ltr', flag: '🇬🇧' },
  { code: 'fr', nameEn: 'French', nameNative: 'Français', direction: 'ltr', flag: '🇫🇷' },
  { code: 'de', nameEn: 'German', nameNative: 'Deutsch', direction: 'ltr', flag: '🇩🇪' },
  { code: 'nl', nameEn: 'Dutch', nameNative: 'Nederlands', direction: 'ltr', flag: '🇳🇱' },
  { code: 'tr', nameEn: 'Turkish', nameNative: 'Türkçe', direction: 'ltr', flag: '🇹🇷' },
  { code: 'fa', nameEn: 'Persian', nameNative: 'فارسی', direction: 'rtl', flag: '🇮🇷' },
  { code: 'es', nameEn: 'Spanish', nameNative: 'Español', direction: 'ltr', flag: '🇪🇸' },
];

interface LanguageContextType {
  language: Language;
  direction: Direction;
  currentLanguage: LanguageOption;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('winova-language');
    return (saved as Language) || 'ar';
  });

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];
  const direction: Direction = currentLanguage.direction;

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    i18n.changeLanguage(language);
    localStorage.setItem('winova-language', language);
  }, [language, direction, i18n]);

  const toggleLanguage = () => {
    // Cycle through languages
    const currentIndex = SUPPORTED_LANGUAGES.findIndex(l => l.code === language);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
    setLanguageState(SUPPORTED_LANGUAGES[nextIndex].code);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, direction, currentLanguage, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
