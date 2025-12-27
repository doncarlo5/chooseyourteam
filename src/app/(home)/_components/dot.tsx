import { useEffect } from "react";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "../../../components/app-text";
import type { DotProps } from "../../../helpers/types/home-screen";

export default function Dot({
  x,
  y,
  baseColor,
  revealColor,
  isRevealed,
  baseSize,
  revealSize,
  label,
  active,
  opacity,
  scale,
  shakePhase,
  shakeAmplitude,
}: DotProps) {
  const progress = useSharedValue(isRevealed ? 1 : 0);
  const size = useSharedValue(isRevealed ? revealSize : baseSize);

  useEffect(() => {
    progress.value = withTiming(isRevealed ? 1 : 0, { duration: 200 });
    size.value = withTiming(isRevealed ? revealSize : baseSize, {
      duration: 200,
    });
  }, [isRevealed, baseSize, revealSize, progress, size]);

  const containerStyle = useAnimatedStyle(() => {
    const currentSize = size.value;
    const isVisible = active.value === 1;
    const shakeOffset = (shakePhase.value - 0.5) * 2 * shakeAmplitude;
    return {
      position: "absolute",
      left: x.value - currentSize / 2,
      top: y.value - currentSize / 2,
      width: currentSize,
      height: currentSize,
      alignItems: "center",
      justifyContent: "center",
      opacity: isVisible ? opacity.value : 0,
      transform: [
        { translateX: isVisible ? shakeOffset : 0 },
        { scale: (isVisible ? 1 : 0.85) * scale.value },
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
        [baseColor, revealColor]
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
        [baseColor, revealColor]
      ),
    };
  });

  if (!isRevealed || !label) {
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
        {label}
      </AppText>
    </Animated.View>
  );
}
