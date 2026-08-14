import { describe, expect, it } from "vitest";
import {
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
