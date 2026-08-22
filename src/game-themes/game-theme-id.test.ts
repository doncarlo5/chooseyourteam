import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_THEME_ID,
  GAME_THEME_IDS,
  isGameThemeId,
  parseGameThemeId,
} from "./game-theme-id";

describe("game theme IDs", () => {
  it("recognizes every supported theme", () => {
    expect(GAME_THEME_IDS).toEqual(["desert-lagoon", "neon-arena"]);
    expect(GAME_THEME_IDS.every(isGameThemeId)).toBe(true);
  });

  it("falls back to Desert Lagoon for missing and invalid values", () => {
    expect(parseGameThemeId(null)).toBe(DEFAULT_GAME_THEME_ID);
    expect(parseGameThemeId(undefined)).toBe(DEFAULT_GAME_THEME_ID);
    expect(parseGameThemeId("future-theme")).toBe(DEFAULT_GAME_THEME_ID);
    expect(parseGameThemeId(1)).toBe(DEFAULT_GAME_THEME_ID);
  });
});
