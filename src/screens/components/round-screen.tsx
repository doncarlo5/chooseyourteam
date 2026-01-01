import { AppText } from "@/src/components/app-text";
import { cn } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const startSkeletonPulse = (progress: SharedValue<number>) => {
  progress.value = withRepeat(
    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
    -1,
    true
  );
};

export default function RoundScreen(props: {
  fingersCount: number;
  touchCount: number;
  isActive: boolean;
  isFrozen: boolean;
  allowOverExpected: boolean;
}) {
  const pulseProgress = useSharedValue(0.35);
  const waitingLabel = props.allowOverExpected
    ? "One finger per player"
    : "Waiting for";
  const numberLabel = String(props.fingersCount);
  const fingersLabel = props.fingersCount === 1 ? "finger" : "fingers";
  const shouldShowLabel =
    !props.isFrozen &&
    (!props.isActive ||
      (props.allowOverExpected
        ? props.touchCount < 2
        : props.touchCount !== props.fingersCount));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseProgress.value,
  }));

  useEffect(() => {
    cancelAnimation(pulseProgress);
    pulseProgress.value = 0.35;
    if (!props.allowOverExpected) {
      return;
    }
    startSkeletonPulse(pulseProgress);
  }, [props.allowOverExpected, pulseProgress]);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="items-center gap-3">
        {shouldShowLabel ? (
          <Animated.View className="items-center" style={pulseStyle}>
            {props.allowOverExpected ? (
              <View className="items-center p-10">
                <AppText
                  className={cn(
                    "text-5xl font-semibold text-center leading-13 text-black/30"
                  )}
                  style={{ fontFamily: "QuickSandRegular" }}
                >
                  One finger
                </AppText>
                <AppText
                  className={cn(
                    "text-5xl font-semibold text-center leading-13 text-black/30"
                  )}
                  style={{ fontFamily: "QuickSandRegular" }}
                >
                  per player
                </AppText>
              </View>
            ) : (
              <>
                <AppText
                  className={cn(
                    "text-4xl font-semibold text-center leading-none text-black/20"
                  )}
                  style={{ fontFamily: "QuickSandRegular" }}
                >
                  {waitingLabel}
                </AppText>
                <AppText
                  className={cn(
                    "text-7xl font-semibold text-center leading-none mt-3 text-black/25"
                  )}
                  style={{ fontFamily: "QuickSandRegular" }}
                >
                  {numberLabel}
                </AppText>
                <AppText
                  className={cn(
                    "text-4xl font-semibold text-center leading-none text-black/20"
                  )}
                  style={{ fontFamily: "QuickSandRegular" }}
                >
                  {fingersLabel}
                </AppText>
              </>
            )}
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
