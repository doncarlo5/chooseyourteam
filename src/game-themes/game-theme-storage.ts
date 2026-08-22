import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_GAME_THEME_ID,
  parseGameThemeId,
  type GameThemeId,
} from "./game-theme-id";

export const GAME_THEME_STORAGE_KEY = "chooseyourteam.game-theme.v1";

export type GameThemeStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const loadGameThemeId = async (
  storage: GameThemeStorage = AsyncStorage,
): Promise<GameThemeId> => {
  try {
    return parseGameThemeId(await storage.getItem(GAME_THEME_STORAGE_KEY));
  } catch (error) {
    console.error("[GameTheme] Unable to load theme preference:", error);
    return DEFAULT_GAME_THEME_ID;
  }
};

export const persistGameThemeId = async (
  themeId: GameThemeId,
  storage: GameThemeStorage = AsyncStorage,
) => {
  try {
    await storage.setItem(GAME_THEME_STORAGE_KEY, themeId);
    return true;
  } catch (error) {
    console.error("[GameTheme] Unable to save theme preference:", error);
    return false;
  }
};
