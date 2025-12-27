import type { ReactNode } from "react";
import type { SharedValue } from "react-native-reanimated";

export type TouchRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  isReady: boolean;
};

export type PlayerCardProps = {
  count: number;
  index: number;
  isDark: boolean;
  isDisabled: boolean;
  onPress: () => void;
  label?: string;
};

export type DotProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  shakePhase: SharedValue<number>;
  baseColor: string;
  revealColor: string;
  isRevealed: boolean;
  baseSize: number;
  revealSize: number;
  label?: string;
};

export type SelectedPlayersLayerProps = {
  selectedTeams: number | null;
  isDark: boolean;
  onBack: () => void;
  toggleRectSv: SharedValue<TouchRect>;
  plusButtonRectSv: SharedValue<TouchRect>;
  children?: ReactNode;
};
