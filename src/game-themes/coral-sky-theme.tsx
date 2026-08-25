import CoralSkyBackground from "./coral-sky-background";
import { desertLagoonTheme } from "./desert-lagoon-theme";
import type { GameThemeDefinition } from "./game-theme-types";

export const coralSkyTheme: GameThemeDefinition = {
  id: "coral-sky",
  displayName: "Coral Sky",
  Background: CoralSkyBackground,
  chrome: {
    ...desertLagoonTheme.chrome,
    accentColor: "#FF6A21",
  },
};
