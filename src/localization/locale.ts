export type SupportedLocale = "en" | "fr";
export type AppLocale = SupportedLocale | "pseudo";
export type LocalePreference = SupportedLocale | "system";

export type DeviceLocalePreference = {
  languageCode?: string | null;
  languageTag?: string | null;
};

const DEFAULT_LOCALE: SupportedLocale = "en";

const getLanguageCode = (preference: DeviceLocalePreference) => {
  if (preference.languageCode) {
    return preference.languageCode.toLowerCase();
  }

  return preference.languageTag?.split("-")[0]?.toLowerCase() ?? null;
};

export const resolveSupportedLocale = (
  preferences: readonly DeviceLocalePreference[],
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

export const isLocalePreference = (value: unknown): value is LocalePreference =>
  value === "system" || value === "en" || value === "fr";

export const parseLocalePreference = (value: string | null) =>
  isLocalePreference(value) ? value : "system";

export const resolveAppLocale = (
  localePreference: LocalePreference,
  deviceLocales: readonly DeviceLocalePreference[],
  developmentOverride: AppLocale | null,
): AppLocale => {
  if (developmentOverride) {
    return developmentOverride;
  }

  return localePreference === "system"
    ? resolveSupportedLocale(deviceLocales)
    : localePreference;
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
