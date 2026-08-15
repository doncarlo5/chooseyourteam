import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseLocalePreference, type LocalePreference } from "./locale";

export const LOCALE_PREFERENCE_STORAGE_KEY =
  "chooseyourteam.locale-preference.v1";

type LocalePreferenceStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const loadLocalePreference = async (
  storage: LocalePreferenceStorage = AsyncStorage,
): Promise<LocalePreference> => {
  try {
    const storedPreference = await storage.getItem(
      LOCALE_PREFERENCE_STORAGE_KEY,
    );
    return parseLocalePreference(storedPreference);
  } catch (error) {
    console.error("[Localization] Unable to load language preference:", error);
    return "system";
  }
};

export const persistLocalePreference = async (
  localePreference: LocalePreference,
  storage: LocalePreferenceStorage = AsyncStorage,
) => {
  try {
    await storage.setItem(LOCALE_PREFERENCE_STORAGE_KEY, localePreference);
    return true;
  } catch (error) {
    console.error("[Localization] Unable to save language preference:", error);
    return false;
  }
};
