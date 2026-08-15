import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOCALE_PREFERENCE_STORAGE_KEY,
  loadLocalePreference,
  persistLocalePreference,
} from "./locale-preference";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("locale preference storage", () => {
  it("loads and validates a persisted preference", async () => {
    const storage = {
      getItem: vi.fn().mockResolvedValue("fr"),
      setItem: vi.fn(),
    };

    await expect(loadLocalePreference(storage)).resolves.toBe("fr");
    expect(storage.getItem).toHaveBeenCalledWith(LOCALE_PREFERENCE_STORAGE_KEY);
  });

  it("falls back to system for an invalid persisted preference", async () => {
    const storage = {
      getItem: vi.fn().mockResolvedValue("pseudo"),
      setItem: vi.fn(),
    };

    await expect(loadLocalePreference(storage)).resolves.toBe("system");
  });

  it("falls back to system when hydration fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage = {
      getItem: vi.fn().mockRejectedValue(new Error("read failed")),
      setItem: vi.fn(),
    };

    await expect(loadLocalePreference(storage)).resolves.toBe("system");
    expect(console.error).toHaveBeenCalledOnce();
  });

  it("persists the preference under the versioned key", async () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn().mockResolvedValue(undefined),
    };

    await expect(persistLocalePreference("en", storage)).resolves.toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      LOCALE_PREFERENCE_STORAGE_KEY,
      "en",
    );
  });

  it("reports a failed write without throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn().mockRejectedValue(new Error("write failed")),
    };

    await expect(persistLocalePreference("fr", storage)).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledOnce();
  });
});
