import { afterEach, describe, expect, it, vi } from "vitest";

const nativePluralRules = Intl.PluralRules;

afterEach(() => {
  Object.defineProperty(Intl, "PluralRules", {
    configurable: true,
    value: nativePluralRules,
    writable: true,
  });
  vi.resetModules();
});

describe("native Intl polyfills", () => {
  it("installs English and French plural rules when Hermes omits them", async () => {
    Object.defineProperty(Intl, "PluralRules", {
      configurable: true,
      value: undefined,
      writable: true,
    });

    await import("./polyfills.native");

    expect(new Intl.PluralRules("en").select(1)).toBe("one");
    expect(new Intl.PluralRules("en").select(2)).toBe("other");
    expect(new Intl.PluralRules("fr").select(1)).toBe("one");
    expect(new Intl.PluralRules("fr").select(2)).toBe("other");
  });
});
