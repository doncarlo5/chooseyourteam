import { describe, expect, it } from "vitest";
import {
  isLocalePreference,
  parseLocalePreference,
  resolveAppLocale,
  resolveDevelopmentLocaleOverride,
  resolveSupportedLocale,
} from "./locale";

describe("resolveSupportedLocale", () => {
  it.each([
    ["fr", "fr"],
    ["fr-FR", "fr"],
    ["fr-CA", "fr"],
    ["en", "en"],
    ["en-US", "en"],
  ] as const)("resolves %s to %s", (languageTag, expectedLocale) => {
    expect(resolveSupportedLocale([{ languageTag }])).toBe(expectedLocale);
  });

  it("uses the first supported preference", () => {
    expect(
      resolveSupportedLocale([
        { languageTag: "es-ES" },
        { languageTag: "fr-FR" },
        { languageTag: "en-US" },
      ]),
    ).toBe("fr");
  });

  it("falls back to English for unsupported or empty preferences", () => {
    expect(resolveSupportedLocale([{ languageTag: "es-ES" }])).toBe("en");
    expect(resolveSupportedLocale([])).toBe("en");
  });
});

describe("locale preference", () => {
  it.each(["system", "en", "fr"] as const)(
    "accepts %s as a user preference",
    (localePreference) => {
      expect(isLocalePreference(localePreference)).toBe(true);
      expect(parseLocalePreference(localePreference)).toBe(localePreference);
    },
  );

  it("treats missing and invalid stored values as system", () => {
    expect(parseLocalePreference(null)).toBe("system");
    expect(parseLocalePreference("pseudo")).toBe("system");
    expect(parseLocalePreference("es")).toBe("system");
  });

  it("gives the development override priority over user and device locales", () => {
    expect(resolveAppLocale("fr", [{ languageTag: "en-US" }], "pseudo")).toBe(
      "pseudo",
    );
  });

  it("keeps a manual preference ahead of the device locale", () => {
    expect(resolveAppLocale("fr", [{ languageTag: "en-US" }], null)).toBe("fr");
    expect(resolveAppLocale("en", [{ languageTag: "fr-FR" }], null)).toBe("en");
  });

  it("uses the device locale only for the system preference", () => {
    expect(resolveAppLocale("system", [{ languageTag: "fr-CA" }], null)).toBe(
      "fr",
    );
  });
});

describe("resolveDevelopmentLocaleOverride", () => {
  it.each(["en", "fr", "pseudo"] as const)(
    "accepts %s in development",
    (locale) => {
      expect(resolveDevelopmentLocaleOverride(locale, true)).toBe(locale);
    },
  );

  it("normalizes a valid development override", () => {
    expect(resolveDevelopmentLocaleOverride(" FR ", true)).toBe("fr");
  });

  it("rejects invalid and production overrides", () => {
    expect(resolveDevelopmentLocaleOverride("es", true)).toBeNull();
    expect(resolveDevelopmentLocaleOverride("pseudo", false)).toBeNull();
  });
});
