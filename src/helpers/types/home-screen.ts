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
};
