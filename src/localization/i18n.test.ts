import { setupI18n } from "@lingui/core";
import { describe, expect, it } from "vitest";
import { createAppI18n, withEnglishFallback } from "./catalogs";

describe("localization catalogs", () => {
  it("activates English and French messages", () => {
    const i18n = createAppI18n("en");
    expect(i18n._("CAL6E9")).toBe("Teams");

    i18n.activate("fr");
    expect(i18n._("CAL6E9")).toBe("Équipes");
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

  it("formats English and French setup values and controls", () => {
    const i18n = createAppI18n("en");
    expect(i18n._("neJFcM")).toBe("More players");
    expect(i18n._("IfUZk6")).toBe("Up to 5 players");
    expect(i18n._("79s-vI")).toBe("Select 6 players");
    expect(i18n._("CVVTS5")).toBe("Use up to 5 players");
    expect(i18n._("WupljG", { 0: 6 })).toBe("Players, 6");
    expect(i18n._("rlkLUZ", { 0: 3 })).toBe("Teams, 3");

    i18n.activate("fr");
    expect(i18n._("neJFcM")).toBe("Plus de joueurs");
    expect(i18n._("IfUZk6")).toBe("Jusqu’à 5 joueurs");
    expect(i18n._("79s-vI")).toBe("Sélectionner 6 joueurs");
    expect(i18n._("CVVTS5")).toBe("Utiliser jusqu’à 5 joueurs");
    expect(i18n._("WupljG", { 0: 6 })).toBe("Joueurs, 6");
    expect(i18n._("rlkLUZ", { 0: 3 })).toBe("Équipes, 3");
  });

  it("localizes the Android observed-touch capacity warning", () => {
    const i18n = createAppI18n("en");
    expect(i18n._("GE7TqB", { MAX_OBSERVED_PLAYER_COUNT: 12 })).toBe(
      "Maximum 12 fingers",
    );
    expect(i18n._("BMQZnr", { MAX_OBSERVED_PLAYER_COUNT: 12 })).toBe(
      "Only the first 12 detected fingers can join.",
    );

    i18n.activate("fr");
    expect(i18n._("GE7TqB", { MAX_OBSERVED_PLAYER_COUNT: 12 })).toBe(
      "12 doigts maximum",
    );
    expect(i18n._("BMQZnr", { MAX_OBSERVED_PLAYER_COUNT: 12 })).toBe(
      "Seuls les 12 premiers doigts détectés participent.",
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

    expect(i18n._("CAL6E9")).toMatch(/^⟦.+⟧$/);
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

    expect(i18n._("CAL6E9")).toBe("Teams");
  });
});
