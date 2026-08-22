import { AppText } from "@/src/components/app-text";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { msg, plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react";
import { cn } from "heroui-native";
import { createElement, useEffect } from "react";
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
  progress.set(
    withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    ),
  );
};

function RoundInstruction(props: { count: number; requiresAtLeast: boolean }) {
  const { theme } = useGameTheme();
  const waitingClassName = cn(
    "text-4xl font-medium text-center leading-none",
    theme.chrome.instructionTextClassName,
  );
  const numberClassName = cn(
    "text-7xl font-medium text-center leading-none mt-3",
    theme.chrome.instructionNumberTextClassName,
  );
  const unitClassName = cn(
    "pb-1 text-4xl font-medium text-center",
    theme.chrome.instructionTextClassName,
  );
  const sharedStyle = { fontFamily: "QuickSand" };
  const count = props.count;
  const descriptor = props.requiresAtLeast
    ? msg({
        comment:
          "Touch instruction. Keep the waiting, number, and unit elements so each line retains its styling.",
        message: plural(count, {
          one: "<waiting>Put at least</waiting><number>#</number><unit>finger</unit>",
          other:
            "<waiting>Put at least</waiting><number>#</number><unit>fingers</unit>",
        }),
      })
    : msg({
        comment:
          "Touch instruction. Keep the waiting, number, and unit elements so each line retains its styling.",
        message: plural(count, {
          one: "<waiting>Put</waiting><number>#</number><unit>finger</unit>",
          other: "<waiting>Put</waiting><number>#</number><unit>fingers</unit>",
        }),
      });

  return createElement(Trans, {
    ...descriptor,
    components: {
      waiting: <AppText className={waitingClassName} style={sharedStyle} />,
      number: <AppText className={numberClassName} style={sharedStyle} />,
      unit: <AppText className={unitClassName} style={sharedStyle} />,
    },
  });
}

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
  const requiresAtLeast = props.allowOverExpected && !shouldCapAtFive;
  const shouldShowLabel =
    !props.isFrozen &&
    (!props.isActive ||
      (props.allowOverExpected
        ? props.touchCount < props.fingersCount
        : props.touchCount !== props.fingersCount));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseProgress.get(),
  }));

  useEffect(() => {
    cancelAnimation(pulseProgress);
    pulseProgress.set(0.35);
    if (!props.allowOverExpected) {
      return;
    }
    startSkeletonPulse(pulseProgress);
  }, [props.allowOverExpected, pulseProgress]);

  return (
    <View className={cn("flex-1 items-center justify-center px-8")}>
      <View className={cn("items-center gap-3")}>
        {shouldShowLabel ? (
          <Animated.View className={cn("items-center")} style={pulseStyle}>
            <RoundInstruction
              count={props.fingersCount}
              requiresAtLeast={requiresAtLeast}
            />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}
