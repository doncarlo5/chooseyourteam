// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  {
    ignores: ["dist/*", "src/localization/locales/*/messages.ts"],
  },
  expoConfig,
  {
    rules: {
      // Reanimated shared values and gesture worklets intentionally mutate
      // values that React's compiler-oriented lint rules treat as immutable.
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      // React Native Text renders apostrophes and quotes directly.
      "react/no-unescaped-entities": "off",
    },
  },
]);
