import { getLocales } from "expo-localization";
import {
  resolveDevelopmentLocaleOverride,
  resolveAppLocale,
  type AppLocale,
  type LocalePreference,
} from "./locale";

export const getAppLocale = (
  localePreference: LocalePreference = "system",
): AppLocale => {
  const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;
  const developmentOverride = resolveDevelopmentLocaleOverride(
    process.env.EXPO_PUBLIC_APP_LOCALE,
    isDevelopment,
  );

  return resolveAppLocale(localePreference, getLocales(), developmentOverride);
};
