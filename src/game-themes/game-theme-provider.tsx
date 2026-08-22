import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_GAME_THEME_ID, type GameThemeId } from "./game-theme-id";
import { getGameTheme } from "./game-theme-registry";
import {
  loadGameThemeId,
  persistGameThemeId,
  type GameThemeStorage,
} from "./game-theme-storage";
import type { GameThemeDefinition } from "./game-theme-types";

type GameThemeContextValue = {
  isReady: boolean;
  themeId: GameThemeId;
  theme: GameThemeDefinition;
  setThemeId: (themeId: GameThemeId) => Promise<void>;
};

const GameThemeContext = createContext<GameThemeContextValue | null>(null);

export function GameThemeProvider(props: {
  children: ReactNode;
  storage?: GameThemeStorage;
}) {
  const [isReady, setIsReady] = useState(false);
  const [themeId, setStoredThemeId] = useState<GameThemeId>(
    DEFAULT_GAME_THEME_ID,
  );

  const initializeGameTheme = useCallback(() => {
    let isMounted = true;

    void loadGameThemeId(props.storage).then((storedThemeId) => {
      if (!isMounted) {
        return;
      }
      setStoredThemeId(storedThemeId);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, [props.storage]);

  useEffect(initializeGameTheme, [initializeGameTheme]);

  const setThemeId = useCallback(
    async (nextThemeId: GameThemeId) => {
      setStoredThemeId(nextThemeId);
      await persistGameThemeId(nextThemeId, props.storage);
    },
    [props.storage],
  );

  const contextValue = useMemo(
    () => ({
      isReady,
      themeId,
      theme: getGameTheme(themeId),
      setThemeId,
    }),
    [isReady, setThemeId, themeId],
  );

  return (
    <GameThemeContext.Provider value={contextValue}>
      {props.children}
    </GameThemeContext.Provider>
  );
}

export const useGameTheme = () => {
  const context = useContext(GameThemeContext);

  if (!context) {
    throw new Error("useGameTheme must be used within GameThemeProvider");
  }

  return context;
};
