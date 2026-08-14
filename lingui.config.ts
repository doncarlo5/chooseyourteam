import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "fr", "pseudo"],
  fallbackLocales: {
    default: "en",
    pseudo: "en",
  },
  pseudoLocale: {
    locale: "pseudo",
    prepend: "⟦",
    append: "⟧",
    extend: 0.4,
  },
  catalogs: [
    {
      path: "<rootDir>/src/localization/locales/{locale}/messages",
      include: [
        "<rootDir>/src/screens",
        "<rootDir>/src/app/(home)/_layout.tsx",
      ],
    },
  ],
  compileNamespace: "ts",
});
