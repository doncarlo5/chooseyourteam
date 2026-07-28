import { AppText } from "@/src/components/app-text";
import { cn } from "heroui-native";
import { useEffect } from "react";
import { Platform, View } from "react-native";
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
    withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
    -1,
    true,
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
  const isIphone = Platform.OS === "ios" && !Platform.isPad;
  const shouldCapAtFive =
    props.allowOverExpected && isIphone && props.fingersCount === 5;
  const waitingLabel =
    props.allowOverExpected && !shouldCapAtFive ? "Put at least" : "Put";
  const numberLabel = shouldCapAtFive ? "5" : String(props.fingersCount);
  const fingersLabel = props.fingersCount === 1 ? "finger" : "fingers";
  const shouldShowLabel =
    !props.isFrozen &&
    (!props.isActive ||
      (props.allowOverExpected
        ? props.touchCount < props.fingersCount
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
            <>
              <AppText
                className={cn(
                  "text-4xl font-medium text-center leading-none text-black/25",
                )}
                style={{ fontFamily: "QuickSand" }}
              >
                {waitingLabel}
              </AppText>
              <AppText
                className={cn(
                  "text-7xl font-medium text-center leading-none mt-3 text-black/30",
                )}
                style={{ fontFamily: "QuickSand" }}
              >
                {numberLabel}
              </AppText>
              <AppText
                className={cn(
                  "text-4xl font-medium text-center leading-none text-black/25",
                )}
                style={{ fontFamily: "QuickSand" }}
              >
                {fingersLabel}
              </AppText>
            </>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
