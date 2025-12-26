import type { RefObject } from "react";
import type { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

export type PlayerCardProps = {
  count: number;
  index: number;
  isDark: boolean;
  isDisabled: boolean;
  onPress: () => void;
};

export type DotProps = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  baseColor: string;
  revealColor: string;
  isRevealed: boolean;
  baseSize: number;
  revealSize: number;
  label?: string;
};

export type SelectedPlayersLayerProps = {
  selectedGroups: number | null;
  isDark: boolean;
  slotX: SharedValue<number>[];
  slotY: SharedValue<number>[];
  slotActive: SharedValue<number>[];
  slotOpacity: SharedValue<number>[];
  slotScale: SharedValue<number>[];
  slotRevealColors: string[];
  slotRevealLabels: (string | null)[];
  isRevealed: boolean;
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
