import type { RefObject } from "react";
import type { View } from "react-native";
import type { TouchPoint } from "./touch-point";

export type PlayerCardProps = {
  count: number;
  index: number;
  isDark: boolean;
  isDisabled: boolean;
  onPress: () => void;
};

export type DotProps = {
  x: number;
  y: number;
  baseColor: string;
  revealColor: string;
  isRevealed: boolean;
  baseSize: number;
  revealSize: number;
  label?: string;
};

export type SelectedPlayersLayerProps = {
  selectedPlayers: number | null;
  isDark: boolean;
  touches: TouchPoint[];
  revealedTouches: TouchPoint[];
  frozenTouches: TouchPoint[];
  isRevealed: boolean;
  teamAssignments: Record<string, string>;
  teamNumbers: Record<string, number>;
  baseSize: number;
  revealSize: number;
  onBack: () => void;
  backRef: RefObject<View | null>;
  onBackLayout: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
};
