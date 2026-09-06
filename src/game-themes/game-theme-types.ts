import type { TeamNumber } from "../domain/team-identity";
import type { ComponentType } from "react";
import type { ColorValue, TextStyle, ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export type GameThemeChrome = {
  screenBackgroundColor: ColorValue;
  brandTextClassName: string;
  primaryTextClassName: string;
  secondaryTextClassName: string;
  instructionTextClassName: string;
  instructionNumberTextClassName: string;
  cardClassName: string;
  cardSecondaryTextClassName: string;
  cardOverlayClassName: string;
  cardActiveClassName: string;
  pairingSurfaceClassName: string;
  pairingPrimaryTextClassName: string;
  pairingSecondaryTextClassName: string;
  controlClassName: string;
  controlOverlayClassName: string;
  controlBlurTint: "light" | "dark";
  controlIconColor: string;
  navigationIconColor: string;
  paginationInactiveColor: string;
  paginationActiveColor: string;
  dialogSurfaceColor: string;
  dialogOptionClassName: string;
  dialogOptionOverlayClassName: string;
  dialogOptionGradient: readonly [ColorValue, ColorValue];
  reviewSurfaceClassName: string;
  reviewForegroundClassName: string;
  reviewIconColor: string;
  revealedLabelClassName: string;
  revealedLabelStyle?: TextStyle;
  accentColor: string;
  switchTrackColor?: { false: ColorValue; true: ColorValue };
  switchThumbColor?: ColorValue;
  statusBarStyle: "light" | "dark";
};

export type UnrevealedDotArtworkProps = {
  size: number;
  holdProgress: SharedValue<number>;
  clock: SharedValue<number>;
};

export type UnrevealedDotBaseArtworkProps = {
  size: number;
};

export type RevealedDotArtworkProps = {
  size: number;
  team: TeamNumber;
};

export type SharedRevealedDotArtworkProps = {
  size: number;
  team: SharedValue<number>;
};

export type GameThemeArtwork = {
  UnrevealedDot: ComponentType<UnrevealedDotArtworkProps>;
  RasterizedUnrevealedBase?: ComponentType<UnrevealedDotBaseArtworkProps>;
  UnrevealedOverlay?: ComponentType<UnrevealedDotArtworkProps>;
  RevealedDot: ComponentType<RevealedDotArtworkProps>;
  SharedRevealedDot: ComponentType<SharedRevealedDotArtworkProps>;
};

export type GameThemeDefinition = {
  id: import("./game-theme-id").GameThemeId;
  displayName: string;
  Background: ComponentType;
  typography: Record<"body" | "title" | "number", TextStyle>;
  surfaces: {
    card: ViewStyle;
    control: ViewStyle;
    blur: boolean;
  };
  start: {
    variant: "pill" | "raised" | "beveled";
    backgroundColor: string;
    foregroundColor: string;
    borderColor: string;
    style: ViewStyle;
    pressedStyle: ViewStyle;
  };
  chrome: GameThemeChrome;
};
