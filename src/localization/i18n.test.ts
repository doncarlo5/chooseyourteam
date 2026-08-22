import { setupI18n } from "@lingui/core";
import { describe, expect, it } from "vitest";
import { createAppI18n, withEnglishFallback } from "./catalogs";

describe("localization catalogs", () => {
  it("activates English and French messages", () => {
    const i18n = createAppI18n("en");
    expect(i18n._("LNZ6mg")).toBe("How many teams?");

    i18n.activate("fr");
    expect(i18n._("LNZ6mg")).toBe("Combien d’équipes ?");
  });

  it("localizes the settings sheet while preserving language autonyms", () => {
    const i18n = createAppI18n("en");

    expect(i18n._("uyJsf6")).toBe("About");
    expect(i18n._("D-NlUC")).toBe("System");
    expect(i18n._("OnXNdD")).toBe("JT Company. Made in 🇫🇷");

    i18n.activate("fr");
    expect(i18n._("uyJsf6")).toBe("À propos");
    expect(i18n._("D-NlUC")).toBe("Système");
    expect(i18n._("OnXNdD")).toBe("JT Company. Fait en 🇫🇷");
    expect(i18n._("lYGfRP")).toBe("English");
  });

  it("formats English and French plurals", () => {
    const i18n = createAppI18n("en");
    expect(i18n._("C1flRB", { 0: 1 })).toBe("Select 1 team");
    expect(i18n._("C1flRB", { 0: 3 })).toBe("Select 3 teams");

    i18n.activate("fr");
    expect(i18n._("C1flRB", { 0: 1 })).toBe("Sélectionner 1 équipe");
    expect(i18n._("C1flRB", { 0: 3 })).toBe("Sélectionner 3 équipes");
  });

  it("formats complete visible team and player count labels", () => {
    const i18n = createAppI18n("en");

    expect(i18n._("K3-xS5", { 0: 2 })).toBe(
      "<number>2</number><unit>teams</unit>",
    );
    expect(i18n._("hf29w4", { 0: 6 })).toBe(
      "<number>6</number><unit>players</unit>",
    );

    i18n.activate("fr");
    expect(i18n._("K3-xS5", { 0: 2 })).toBe(
      "<number>2</number><unit>équipes</unit>",
    );
    expect(i18n._("hf29w4", { 0: 6 })).toBe(
      "<number>6</number><unit>joueurs</unit>",
    );
  });

  it("formats complete styled round instructions in both languages", () => {
    const i18n = createAppI18n("en");

    expect(i18n._("Dn5lmf", { count: 1 })).toBe(
      "<waiting>Put</waiting><number>1</number><unit>finger</unit>",
    );
    expect(i18n._("ZsoNbL", { count: 3 })).toBe(
      "<waiting>Put at least</waiting><number>3</number><unit>fingers</unit>",
    );

    i18n.activate("fr");
    expect(i18n._("Dn5lmf", { count: 1 })).toBe(
      "<waiting>Poser</waiting><number>1</number><unit>doigt</unit>",
    );
    expect(i18n._("ZsoNbL", { count: 3 })).toBe(
      "<waiting>Poser au moins</waiting><number>3</number><unit>doigts</unit>",
    );
  });

  it("provides an expanded development pseudolocale", () => {
    const i18n = createAppI18n("pseudo");

    expect(i18n._("LNZ6mg")).toMatch(/^⟦.+⟧$/);
  });

  it("preserves the brand in the pseudolocalized share label", () => {
    const i18n = createAppI18n("pseudo");

    expect(i18n._("KiD1T8", { brandName: "Choose Your Team" })).toContain(
      "Choose Your Team",
    );
  });

  it("formats missing French translations with the English fallback", () => {
    const i18n = setupI18n({
      locale: "fr",
      messages: {
        fr: withEnglishFallback({}),
      },
    });

    expect(i18n._("LNZ6mg")).toBe("How many teams?");
  });
});
