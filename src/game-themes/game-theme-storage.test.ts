import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GAME_THEME_STORAGE_KEY,
  loadGameThemeId,
  persistGameThemeId,
  type GameThemeStorage,
} from "./game-theme-storage";

const createStorage = (storedValue: string | null): GameThemeStorage => ({
  getItem: vi.fn(async () => storedValue),
  setItem: vi.fn(async () => undefined),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("game theme storage", () => {
  it("loads and validates a persisted theme", async () => {
    const storage = createStorage("neon-arena");

    await expect(loadGameThemeId(storage)).resolves.toBe("neon-arena");
    expect(storage.getItem).toHaveBeenCalledWith(GAME_THEME_STORAGE_KEY);
  });

  it("falls back to Desert Lagoon for an invalid persisted value", async () => {
    await expect(loadGameThemeId(createStorage("unknown"))).resolves.toBe(
      "desert-lagoon",
    );
  });

  it("falls back without throwing when hydration fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage = createStorage(null);
    vi.mocked(storage.getItem).mockRejectedValueOnce(new Error("read failed"));

    await expect(loadGameThemeId(storage)).resolves.toBe("desert-lagoon");
  });

  it("persists under the versioned key", async () => {
    const storage = createStorage(null);

    await expect(persistGameThemeId("neon-arena", storage)).resolves.toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      GAME_THEME_STORAGE_KEY,
      "neon-arena",
    );
  });

  it("reports a failed write without throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage = createStorage(null);
    vi.mocked(storage.setItem).mockRejectedValueOnce(new Error("write failed"));

    await expect(persistGameThemeId("neon-arena", storage)).resolves.toBe(
      false,
    );
  });
});
