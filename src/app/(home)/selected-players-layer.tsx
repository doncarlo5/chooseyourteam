import { AppText } from "@/src/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { Button, cn } from "heroui-native";
import { useEffect } from "react";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type {
  DotProps,
  SelectedPlayersLayerProps,
} from "../../helpers/types/home-screen";

const Dot = ({
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
}: DotProps) => {
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
    return {
      position: "absolute",
      left: x.value - currentSize / 2,
      top: y.value - currentSize / 2,
      width: currentSize,
      height: currentSize,
      alignItems: "center",
      justifyContent: "center",
      opacity: isVisible ? opacity.value : 0,
      transform: [{ scale: (isVisible ? 1 : 0.85) * scale.value }],
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

  return (
    <Animated.View
      collapsable={false}
      style={containerStyle}
    >
      <Animated.View style={ringStyle} />
      <Animated.View style={dotStyle} />
      {isRevealed && label ? (
        <AppText className="text-7xl font-extrabold font-mono text-white text-center mt-3">
          {label}
        </AppText>
      ) : null}
    </Animated.View>
  );
};

export default function SelectedPlayersLayer({
  selectedGroups,
  isDark,
  slotX,
  slotY,
  slotActive,
  slotOpacity,
  slotScale,
  slotRevealColors,
  slotRevealLabels,
  isRevealed,
  baseSize,
  revealSize,
  backRef,
  onBack,
  onBackLayout,
}: SelectedPlayersLayerProps) {
  if (!selectedGroups) {
    return null;
  }

  const baseColor = isDark ? "#E4E4E4" : "#0B0B0B";

  return (
    <>
      <Button
        size="md"
        className={cn(
          "absolute top-16 left-6 z-10 rounded-full",
          isDark ? "bg-[#E4E4E4]/50" : "bg-[#0B0B0B]/50"
        )}
        onPress={onBack}
        onLayout={() => {
          backRef.current?.measureInWindow((x, y, width, height) => {
            onBackLayout({ x, y, width, height });
          });
        }}
        ref={backRef}
        isIconOnly
      >
        <Button.Label>
          <Ionicons
            name="close"
            size={24}
            color={isDark ? "#0b0b0b" : "white"}
          />
        </Button.Label>
      </Button>

      {slotActive.map((active, index) => {
        const revealColor = slotRevealColors[index] || baseColor;
        const label = slotRevealLabels[index];
        return (
          <Dot
            key={index}
            x={slotX[index]}
            y={slotY[index]}
            active={active}
            opacity={slotOpacity[index]}
            scale={slotScale[index]}
            baseColor={baseColor}
            revealColor={revealColor}
            isRevealed={isRevealed}
            baseSize={baseSize}
            revealSize={revealSize}
            label={isRevealed && label ? label : undefined}
          />
        );
      })}
    </>
  );
}
