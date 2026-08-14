import { I18nProvider } from "@lingui/react";
import { useEffect, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import { getAppLocale } from "./device-locale";
import { activateLocale, i18n } from "./i18n";

const refreshActiveLocale = () => {
  const nextLocale = getAppLocale();
  if (nextLocale !== i18n.locale) {
    activateLocale(nextLocale);
  }
};

export const subscribeToLocaleChanges = () => {
  if (Platform.OS !== "android") {
    return undefined;
  }

  let previousState = AppState.currentState;
  const subscription = AppState.addEventListener("change", (nextState) => {
    const becameActive = previousState !== "active" && nextState === "active";
    previousState = nextState;

    if (becameActive) {
      refreshActiveLocale();
    }
  });

  return () => subscription.remove();
};

export function LocalizationProvider(props: { children: ReactNode }) {
  useEffect(subscribeToLocaleChanges, []);

  return <I18nProvider i18n={i18n}>{props.children}</I18nProvider>;
}
