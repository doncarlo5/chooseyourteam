import { AppText } from "@/src/components/app-text";
import type { DotProps } from "@/src/helpers/types/home-screen";
import { useEffect } from "react";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function Dot(props: DotProps) {
  const progress = useSharedValue(props.isRevealed ? 1 : 0);
  const size = useSharedValue(props.isRevealed ? props.revealSize : props.baseSize);

  useEffect(() => {
    progress.value = withTiming(props.isRevealed ? 1 : 0, { duration: 200 });
    size.value = withTiming(props.isRevealed ? props.revealSize : props.baseSize, {
      duration: 200,
    });
  }, [props.isRevealed, props.baseSize, props.revealSize, progress, size]);

  const containerStyle = useAnimatedStyle(() => {
    const currentSize = size.value;
    const isVisible = props.active.value === 1;
    const shakeOffset =
      (props.shakePhase.value - 0.5) * 2 * props.shakeAmplitude;
    return {
      position: "absolute",
      left: props.x.value - currentSize / 2,
      top: props.y.value - currentSize / 2,
      width: currentSize,
      height: currentSize,
      alignItems: "center",
      justifyContent: "center",
      opacity: isVisible ? props.opacity.value : 0,
      transform: [
        { translateX: isVisible ? shakeOffset : 0 },
        { scale: (isVisible ? 1 : 0.85) * props.scale.value },
      ],
    };
  });

  const ringStyle = useAnimatedStyle(() => {
    const currentSize = size.value;
    const ringThickness = Math.max(2, currentSize * 0.08);
    return {
      position: "absolute",
      left: 0,
      top: 0,
      width: currentSize,
      height: currentSize,
      borderRadius: currentSize / 2,
      borderWidth: ringThickness,
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [props.baseColor, props.revealColor]
      ),
      backgroundColor: "transparent",
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    const currentSize = size.value;
    const innerSize = currentSize * 0.73;
    return {
      position: "absolute",
      left: (currentSize - innerSize) / 2,
      top: (currentSize - innerSize) / 2,
      width: innerSize,
      height: innerSize,
      borderRadius: innerSize / 2,
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [props.baseColor, props.revealColor]
      ),
    };
  });

  if (!props.isRevealed || !props.label) {
    return (
      <Animated.View collapsable={false} style={containerStyle}>
        <Animated.View style={ringStyle} />
        <Animated.View style={dotStyle} />
      </Animated.View>
    );
  }

  return (
    <Animated.View collapsable={false} style={containerStyle}>
      <Animated.View style={ringStyle} />
      <Animated.View style={dotStyle} />
      <AppText className="text-7xl font-extrabold font-mono text-white text-center mt-3">
        {props.label}
      </AppText>
    </Animated.View>
  );
}
