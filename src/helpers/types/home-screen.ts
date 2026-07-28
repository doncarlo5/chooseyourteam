import type { TeamNumber } from "@/src/domain/team-identity";
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
  shakeX: SharedValue<number>;
  holdProgress: SharedValue<number>;
  team?: TeamNumber;
  isRevealed: boolean;
  baseSize: number;
  revealSize: number;
};

export type FrozenDot = {
  x: number;
  y: number;
  team: TeamNumber;
};
