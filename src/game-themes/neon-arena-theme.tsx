import type { GameThemeDefinition } from "./game-theme-types";
import NeonArenaBackground from "./neon-arena-background";

const RED = "#EF233C";
const WHITE = "#FFFFFF";
export const neonArenaTheme: GameThemeDefinition = {
  id: "neon-arena",
  displayName: "Neon Arena",
  Background: NeonArenaBackground,
  typography: {
    body: { fontFamily: "Inter_400Regular", fontWeight: "normal" },
    title: { fontFamily: "Rajdhani_700Bold", fontWeight: "normal" },
    number: { fontFamily: "SpaceMono", fontWeight: "normal" },
  },
  surfaces: {
    card: { borderRadius: 8, borderWidth: 1, borderCurve: "continuous" },
    control: {
      backgroundColor: "#090909",
      borderColor: "#EF233C",
      borderWidth: 1,
      borderRadius: 8,
    },
    blur: false,
  },
  start: {
    variant: "beveled",
    backgroundColor: "#090909",
    foregroundColor: "#FFFFFF",
    borderColor: "#EF233C",
    style: {},
    pressedStyle: { transform: [{ translateY: 2 }, { scale: 0.99 }] },
  },
  chrome: {
    screenBackgroundColor: "#000000",
    brandTextClassName: "text-white/80",
    primaryTextClassName: "text-white",
    secondaryTextClassName: "text-white/60",
    instructionTextClassName: "text-white/45",
    instructionNumberTextClassName: "text-white/65",
    cardClassName: "bg-[#090909] border-red-500/60",
    cardSecondaryTextClassName: "text-white/60",
    cardOverlayClassName: "bg-red-950/20",
    cardActiveClassName: "active:bg-red-950/60",
    pairingSurfaceClassName: "bg-black/70 border border-red-500/40",
    pairingPrimaryTextClassName: "text-white/80",
    pairingSecondaryTextClassName: "text-white/50",
    controlClassName:
      "border-red-500/60 bg-black/70 active:bg-red-950/80 active:text-white",
    controlOverlayClassName: "bg-red-950/20",
    controlBlurTint: "dark",
    controlIconColor: WHITE,
    navigationIconColor: WHITE,
    paginationInactiveColor: "#7F1D1D",
    paginationActiveColor: RED,
    dialogSurfaceColor: "#090909",
    dialogOptionClassName: "border-red-500/60",
    dialogOptionOverlayClassName: "bg-black/15",
    dialogOptionGradient: ["rgba(36, 0, 4, 0.96)", "rgba(239, 35, 60, 0.82)"],
    reviewSurfaceClassName: "bg-red-600/80",
    reviewForegroundClassName: "text-white",
    reviewIconColor: WHITE,
    revealedLabelClassName: "text-white",
    revealedLabelStyle: {
      textShadowColor: "rgba(255,255,255,0.72)",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 6,
    },
    accentColor: RED,
    switchTrackColor: { false: "#4B4B4B", true: RED },
    switchThumbColor: WHITE,
    statusBarStyle: "light",
  },
};
