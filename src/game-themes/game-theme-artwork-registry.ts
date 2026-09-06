import { coralSkyArtwork } from "./coral-sky-artwork";
import type { GameThemeId } from "./game-theme-id";
import type { GameThemeArtwork } from "./game-theme-types";
import { desertLagoonArtwork } from "./desert-lagoon-artwork";
import { neonArenaArtwork } from "./neon-arena-artwork";

export const GAME_THEME_ARTWORK_REGISTRY = {
  "desert-lagoon": desertLagoonArtwork,
  "coral-sky": coralSkyArtwork,
  "neon-arena": neonArenaArtwork,
} as const satisfies Record<GameThemeId, GameThemeArtwork>;

export const getGameThemeArtwork = (themeId: GameThemeId): GameThemeArtwork =>
  GAME_THEME_ARTWORK_REGISTRY[themeId];
