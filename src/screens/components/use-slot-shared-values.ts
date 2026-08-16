import { useMemo } from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";

export default function useSlotSharedValues(
  initialValue: number,
): SharedValue<number>[] {
  const slot0 = useSharedValue(initialValue);
  const slot1 = useSharedValue(initialValue);
  const slot2 = useSharedValue(initialValue);
  const slot3 = useSharedValue(initialValue);
  const slot4 = useSharedValue(initialValue);
  const slot5 = useSharedValue(initialValue);
  const slot6 = useSharedValue(initialValue);
  const slot7 = useSharedValue(initialValue);
  const slot8 = useSharedValue(initialValue);
  const slot9 = useSharedValue(initialValue);
  const slot10 = useSharedValue(initialValue);
  const slot11 = useSharedValue(initialValue);

  return useMemo(
    () => [
      slot0,
      slot1,
      slot2,
      slot3,
      slot4,
      slot5,
      slot6,
      slot7,
      slot8,
      slot9,
      slot10,
      slot11,
    ],
    [
      slot0,
      slot1,
      slot2,
      slot3,
      slot4,
      slot5,
      slot6,
      slot7,
      slot8,
      slot9,
      slot10,
      slot11,
    ],
  );
}
