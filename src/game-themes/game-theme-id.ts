export const GAME_THEME_IDS = ["desert-lagoon", "neon-arena"] as const;

export type GameThemeId = (typeof GAME_THEME_IDS)[number];

export const DEFAULT_GAME_THEME_ID: GameThemeId = "desert-lagoon";

export const isGameThemeId = (value: unknown): value is GameThemeId =>
  typeof value === "string" &&
  GAME_THEME_IDS.some((themeId) => themeId === value);

export const parseGameThemeId = (value: unknown): GameThemeId =>
  isGameThemeId(value) ? value : DEFAULT_GAME_THEME_ID;
