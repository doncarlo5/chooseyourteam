import { describe, expect, it, vi } from "vitest";
import { GAME_THEME_IDS } from "./game-theme-id";
import {
  GAME_THEMES,
  GAME_THEME_REGISTRY,
  getGameTheme,
} from "./game-theme-registry";
import {
  GAME_THEME_ARTWORK_REGISTRY,
  getGameThemeArtwork,
} from "./game-theme-artwork-registry";

vi.mock("react-native", () => ({
  StyleSheet: { absoluteFill: {}, create: (styles: unknown) => styles },
  View: () => null,
}));
vi.mock("react-native-reanimated", () => ({
  useDerivedValue: (factory: () => unknown) => factory(),
}));
vi.mock("@shopify/react-native-skia", () => ({
  Circle: () => null,
  Group: () => null,
  Path: () => null,
  SweepGradient: () => null,
  Skia: {
    Path: {
      Circle: () => ({}),
      Make: () => ({}),
      Polygon: () => ({}),
    },
  },
  vec: () => ({}),
}));
vi.mock("../screens/components/mesh-gradient-background", () => ({
  default: () => null,
}));
vi.mock("../screens/components/team-result-artwork", () => ({
  TeamResultArtwork: () => null,
  SharedTeamResultArtwork: () => null,
}));
describe("game theme registry", () => {
  it("contains each supported theme exactly once in picker order", () => {
    expect(Object.keys(GAME_THEME_REGISTRY)).toEqual(GAME_THEME_IDS);
    expect(GAME_THEMES.map((theme) => theme.id)).toEqual(GAME_THEME_IDS);
    expect(new Set(GAME_THEMES.map((theme) => theme.id)).size).toBe(
      GAME_THEMES.length,
    );
  });

  it("provides complete chrome and artwork contracts", () => {
    for (const theme of GAME_THEMES) {
      expect(theme.displayName.length).toBeGreaterThan(0);
      expect(theme.chrome.primaryTextClassName.length).toBeGreaterThan(0);
      expect(theme.chrome.controlClassName.length).toBeGreaterThan(0);
      expect(theme.chrome.dialogSurfaceColor.length).toBeGreaterThan(0);
      expect(theme.chrome.accentColor.length).toBeGreaterThan(0);
      expect(theme.Background).toBeTypeOf("function");
      const artwork = getGameThemeArtwork(theme.id);
      expect(artwork.UnrevealedDot).toBeTypeOf("function");
      expect(artwork.RevealedDot).toBeTypeOf("function");
      expect(artwork.SharedRevealedDot).toBeTypeOf("function");
      expect(getGameTheme(theme.id)).toBe(theme);
      expect(GAME_THEME_ARTWORK_REGISTRY[theme.id]).toBe(artwork);
    }
  });
});
