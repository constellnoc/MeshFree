import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  appLocaleStorageKey,
  appMessages,
  getPreferredAppLocale,
  type AppCopy,
  type AppLocale,
} from "../lib/i18n";

interface LanguageContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  copy: AppCopy;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>(() => getPreferredAppLocale());

  useEffect(() => {
    window.localStorage.setItem(appLocaleStorageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const contextValue = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      copy: appMessages[locale],
    }),
    [locale],
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const contextValue = useContext(LanguageContext);

  if (!contextValue) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return contextValue;
}
