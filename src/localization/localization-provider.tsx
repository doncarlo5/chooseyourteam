import { I18nProvider } from "@lingui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { getAppLocale } from "./device-locale";
import { activateLocale, i18n } from "./i18n";
import {
  loadLocalePreference,
  persistLocalePreference,
} from "./locale-preference";
import type { LocalePreference } from "./locale";

const refreshActiveLocale = (localePreference: LocalePreference) => {
  if (localePreference !== "system") {
    return;
  }

  const nextLocale = getAppLocale(localePreference);
  if (nextLocale !== i18n.locale) {
    activateLocale(nextLocale);
  }
};

export const subscribeToLocaleChanges = (
  getLocalePreference: () => LocalePreference = () => "system",
) => {
  if (Platform.OS !== "android") {
    return undefined;
  }

  let previousState = AppState.currentState;
  const subscription = AppState.addEventListener("change", (nextState) => {
    const becameActive = previousState !== "active" && nextState === "active";
    previousState = nextState;

    if (becameActive) {
      refreshActiveLocale(getLocalePreference());
    }
  });

  return () => subscription.remove();
};

type LocalizationContextValue = {
  isReady: boolean;
  localePreference: LocalePreference;
  setLocalePreference: (localePreference: LocalePreference) => Promise<void>;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(
  null,
);

export function LocalizationProvider(props: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [localePreference, setStoredLocalePreference] =
    useState<LocalePreference>("system");
  const localePreferenceRef = useRef<LocalePreference>("system");

  const initializeLocalization = useCallback(() => {
    let isMounted = true;

    void loadLocalePreference().then((storedPreference) => {
      if (!isMounted) {
        return;
      }

      localePreferenceRef.current = storedPreference;
      setStoredLocalePreference(storedPreference);
      activateLocale(getAppLocale(storedPreference));
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const subscribeToSystemLocaleChanges = useCallback(() => {
    if (!isReady) {
      return undefined;
    }

    return subscribeToLocaleChanges(() => localePreferenceRef.current);
  }, [isReady]);

  useEffect(initializeLocalization, [initializeLocalization]);
  useEffect(subscribeToSystemLocaleChanges, [subscribeToSystemLocaleChanges]);

  const setLocalePreference = useCallback(
    async (nextLocalePreference: LocalePreference) => {
      localePreferenceRef.current = nextLocalePreference;
      setStoredLocalePreference(nextLocalePreference);
      activateLocale(getAppLocale(nextLocalePreference));
      await persistLocalePreference(nextLocalePreference);
    },
    [],
  );

  const contextValue = useMemo(
    () => ({ isReady, localePreference, setLocalePreference }),
    [isReady, localePreference, setLocalePreference],
  );

  return (
    <LocalizationContext.Provider value={contextValue}>
      <I18nProvider i18n={i18n}>{props.children}</I18nProvider>
    </LocalizationContext.Provider>
  );
}

export const useLocalization = () => {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error("useLocalization must be used within LocalizationProvider");
  }

  return context;
};
