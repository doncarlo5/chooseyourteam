export type SupportedLocale = "en" | "fr";
export type AppLocale = SupportedLocale | "pseudo";

export type LocalePreference = {
  languageCode?: string | null;
  languageTag?: string | null;
};

const DEFAULT_LOCALE: SupportedLocale = "en";

const getLanguageCode = (preference: LocalePreference) => {
  if (preference.languageCode) {
    return preference.languageCode.toLowerCase();
  }

  return preference.languageTag?.split("-")[0]?.toLowerCase() ?? null;
};

export const resolveSupportedLocale = (
  preferences: readonly LocalePreference[],
): SupportedLocale => {
  for (const preference of preferences) {
    const languageCode = getLanguageCode(preference);

    if (languageCode === "fr") {
      return "fr";
    }

    if (languageCode === "en") {
      return "en";
    }
  }

  return DEFAULT_LOCALE;
};

export const resolveDevelopmentLocaleOverride = (
  value: string | undefined,
  isDevelopment: boolean,
): AppLocale | null => {
  if (!isDevelopment) {
    return null;
  }

  const normalizedValue = value?.trim().toLowerCase();
  if (
    normalizedValue === "en" ||
    normalizedValue === "fr" ||
    normalizedValue === "pseudo"
  ) {
    return normalizedValue;
  }

  return null;
};
