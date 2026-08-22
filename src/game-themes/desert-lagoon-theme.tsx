import MeshGradientBackground from "../screens/components/mesh-gradient-background";
import type { GameThemeDefinition } from "./game-theme-types";

export const desertLagoonTheme: GameThemeDefinition = {
  id: "desert-lagoon",
  displayName: "Desert Lagoon",
  Background: MeshGradientBackground,
  chrome: {
    screenBackgroundColor: "transparent",
    brandTextClassName: "text-black/75",
    primaryTextClassName: "text-[#0B0B0B]",
    secondaryTextClassName: "text-black/55",
    instructionTextClassName: "text-black/25",
    instructionNumberTextClassName: "text-black/30",
    cardClassName: "bg-white/10 border-white/30",
    cardSecondaryTextClassName: "text-black/60",
    cardOverlayClassName: "bg-white/15",
    cardActiveClassName: "active:bg-white/40",
    pairingSurfaceClassName: "bg-white/70",
    pairingPrimaryTextClassName: "text-black/80",
    pairingSecondaryTextClassName: "text-black/50",
    controlClassName:
      "border-white/60 bg-gray-100/40 active:bg-gray-100/80 active:text-white",
    controlOverlayClassName: "bg-white/15",
    controlBlurTint: "light",
    controlIconColor: "rgba(0,0,0,0.8)",
    navigationIconColor: "#0B0B0B",
    paginationInactiveColor: "#8D8D8D",
    paginationActiveColor: "#D6D6D6",
    dialogSurfaceColor: "#F4EDDE",
    dialogOptionClassName: "border-white/55",
    dialogOptionOverlayClassName: "bg-white/10",
    dialogOptionGradient: [
      "rgba(91, 202, 186, 0.58)",
      "rgba(246, 187, 91, 0.68)",
    ],
    reviewSurfaceClassName: "bg-[#0B0B0B]/20",
    reviewForegroundClassName: "text-white/80",
    reviewIconColor: "#FFFFFF",
    revealedLabelClassName: "text-white",
    accentColor: "#5BCABA",
    statusBarStyle: "dark",
  },
};
