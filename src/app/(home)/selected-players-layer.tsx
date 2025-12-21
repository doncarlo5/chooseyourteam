import { AppText } from "@/src/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import { Button, cn } from "heroui-native";
import { useEffect } from "react";
import Animated, {
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
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
}: DotProps) => {
  const progress = useSharedValue(isRevealed ? 1 : 0);
  const size = useSharedValue(isRevealed ? revealSize : baseSize);

  useEffect(() => {
    progress.value = withTiming(isRevealed ? 1 : 0, { duration: 200 });
    size.value = withTiming(isRevealed ? revealSize : baseSize, {
      duration: 200,
    });
  }, [isRevealed, baseSize, revealSize, progress, size]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentSize = size.value;
    return {
      position: "absolute",
      left: x - currentSize / 2,
      top: y - currentSize / 2,
      width: currentSize,
      height: currentSize,
      borderRadius: currentSize / 2,
      borderWidth: 0,
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [baseColor, revealColor]
      ),
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [baseColor, revealColor]
      ),
      alignItems: "center",
      justifyContent: "center",
    };
  });

  return (
    <Animated.View
      entering={ZoomIn.duration(150)}
      exiting={FadeOut.duration(150)}
      collapsable={false}
      style={animatedStyle}
    >
      {isRevealed && label ? (
        <AppText className="text-7xl font-extrabold font-mono text-white text-center mt-3">
          {label}
        </AppText>
      ) : null}
    </Animated.View>
  );
};

export default function SelectedPlayersLayer({
  selectedPlayers,
  isDark,
  touches,
  revealedTouches,
  frozenTouches,
  isRevealed,
  teamAssignments,
  teamNumbers,
  baseSize,
  revealSize,
  backRef,
  onBack,
  onBackLayout,
}: SelectedPlayersLayerProps) {
  if (!selectedPlayers) {
    return null;
  }

  const baseColor = isDark ? "#E4E4E4" : "#0B0B0B";
  const visibleTouches =
    frozenTouches.length > 0
      ? frozenTouches
      : isRevealed
        ? revealedTouches
        : touches;

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

      {visibleTouches.map((touch) => {
        const revealColor = teamAssignments[touch.id] ?? baseColor;
        const teamNumber = teamNumbers[touch.id];
        return (
          <Dot
            key={touch.id}
            x={touch.x}
            y={touch.y}
            baseColor={baseColor}
            revealColor={revealColor}
            isRevealed={isRevealed || frozenTouches.length > 0}
            baseSize={baseSize}
            revealSize={revealSize}
            label={teamNumber ? String(teamNumber) : undefined}
          />
        );
      })}
    </>
  );
}
