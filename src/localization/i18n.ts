import "./polyfills";
import { createAppI18n } from "./catalogs";
import { getAppLocale } from "./device-locale";
import type { AppLocale } from "./locale";

export const i18n = createAppI18n(getAppLocale());

export const activateLocale = (locale: AppLocale) => {
  i18n.activate(locale);
};
