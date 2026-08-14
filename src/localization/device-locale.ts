import { getLocales } from "expo-localization";
import {
  resolveDevelopmentLocaleOverride,
  resolveSupportedLocale,
  type AppLocale,
} from "./locale";

export const getAppLocale = (): AppLocale => {
  const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;
  const developmentOverride = resolveDevelopmentLocaleOverride(
    process.env.EXPO_PUBLIC_APP_LOCALE,
    isDevelopment,
  );

  return developmentOverride ?? resolveSupportedLocale(getLocales());
};
