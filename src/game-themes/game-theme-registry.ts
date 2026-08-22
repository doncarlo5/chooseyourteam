import { desertLagoonTheme } from "./desert-lagoon-theme";
import { GAME_THEME_IDS, type GameThemeId } from "./game-theme-id";
import type { GameThemeDefinition } from "./game-theme-types";
import { neonArenaTheme } from "./neon-arena-theme";

export const GAME_THEME_REGISTRY = {
  "desert-lagoon": desertLagoonTheme,
  "neon-arena": neonArenaTheme,
} as const satisfies Record<GameThemeId, GameThemeDefinition>;

export const GAME_THEMES = GAME_THEME_IDS.map(
  (themeId) => GAME_THEME_REGISTRY[themeId],
);

export const getGameTheme = (themeId: GameThemeId): GameThemeDefinition =>
  GAME_THEME_REGISTRY[themeId];
