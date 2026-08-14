import { setupI18n, type Messages } from "@lingui/core";
import { messages as englishMessages } from "./locales/en/messages";
import { messages as frenchMessages } from "./locales/fr/messages";
import { messages as pseudoMessages } from "./locales/pseudo/messages";
import type { AppLocale } from "./locale";

export const withEnglishFallback = (messages: Messages): Messages => ({
  ...englishMessages,
  ...messages,
});

const catalogs: Record<AppLocale, Messages> = {
  en: englishMessages,
  fr: withEnglishFallback(frenchMessages),
  pseudo: withEnglishFallback(pseudoMessages),
};

export const getMessagesForLocale = (locale: AppLocale) => catalogs[locale];

export const createAppI18n = (locale: AppLocale) =>
  setupI18n({
    locale,
    messages: catalogs,
  });
