import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { Uniwind, useUniwind } from "uniwind";

type ThemeName =
  | "light"
  | "dark"
  | "brand-light"
  | "brand-dark"
  | "lavender-light"
  | "lavender-dark"
  | "mint-light"
  | "mint-dark"
  | "sky-light"
  | "sky-dark";

interface AppThemeContextType {
  currentTheme: string;
  isLight: boolean;
  isDark: boolean;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const AppThemeContext = createContext<AppThemeContextType | undefined>(
  undefined,
);

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = (
  props,
) => {
  const { theme } = useUniwind();

  const isLight = useMemo(() => {
    return theme === "light" || theme.endsWith("-light");
  }, [theme]);

  const isDark = useMemo(() => {
    return theme === "dark" || theme.endsWith("-dark");
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeName) => {
    Uniwind.setTheme(newTheme);
  }, []);

  useEffect(() => {
    if (theme !== "brand-light") {
      Uniwind.setTheme("brand-light");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    Uniwind.setTheme("brand-light");
  }, []);

  const value = useMemo(
    () => ({
      currentTheme: theme,
      isLight,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [theme, isLight, isDark, setTheme, toggleTheme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {props.children}
    </AppThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
};
