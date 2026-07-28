import { AppText } from "@/src/components/app-text";
import { getTeamIdentity } from "@/src/domain/team-identity";
import type { DotProps } from "@/src/helpers/types/home-screen";
import {
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  SweepGradient,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { TeamResultArtwork } from "./team-result-artwork";

const GLASS_RING = "rgba(255,255,255,0.8)";

export default function Dot(props: DotProps) {
  const progress = useSharedValue(props.isRevealed ? 1 : 0);
  const size = useSharedValue(
    props.isRevealed ? props.revealSize : props.baseSize,
  );
  const identity = props.team ? getTeamIdentity(props.team) : null;
  const revealColor = identity?.color ?? "#0B0B0B";

  useEffect(() => {
    progress.set(withTiming(props.isRevealed ? 1 : 0, { duration: 200 }));
    size.set(
      withTiming(props.isRevealed ? props.revealSize : props.baseSize, {
        duration: 200,
      }),
    );
  }, [props.isRevealed, props.baseSize, props.revealSize, progress, size]);

  const containerStyle = useAnimatedStyle(() => {
    const currentSize = size.value;
    const isVisible = props.active.value === 1;
    const shakeOffset = props.shakeX.value;
    const shake = isVisible ? shakeOffset : 0;

    const shakeY = shake * 0.12;
    const rotateZ = `${(shake / currentSize) * 0.55}rad`;

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
        { translateX: shake },
        { translateY: shakeY },
        { rotateZ },
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
      // Glassy rim at start → team color when revealed
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [GLASS_RING, revealColor],
      ),
      backgroundColor: "transparent",
    };
  });

  const revealOpacity = useDerivedValue(() => progress.value);
  const center = useDerivedValue(() => size.value / 2);

  // Make these reactive to the animated size
  const ringThicknessSk = useDerivedValue(() => Math.max(2, size.value * 0.08));
  const ringRadiusSk = useDerivedValue(
    () => size.value / 2 - ringThicknessSk.value,
  );
  const shimmerRadiusSk = useDerivedValue(
    () => ringRadiusSk.value - ringThicknessSk.value * 0.45,
  );
  const shimmerStrokeSk = useDerivedValue(() =>
    Math.max(1, ringThicknessSk.value * 0.99),
  );

  const shimmerClock = useClock();
  const shimmerOrigin = useDerivedValue(() => vec(center.value, center.value));
  const shimmerTransform = useDerivedValue(() => [
    { rotate: (shimmerClock.value / 1200) * Math.PI * 3 },
  ]);

  const unrevealedOpacity = useDerivedValue(() => 1 - progress.value);
  const holdProgress = useDerivedValue(() => props.holdProgress.value);
  const revealTransform = useDerivedValue(() => [
    { scale: size.value / props.revealSize },
  ]);
  const progressPath = useMemo(() => {
    const sizeValue = props.baseSize;
    const ringThickness = Math.max(2, sizeValue * 0.08);
    const radius = sizeValue / 2 - ringThickness;

    return Skia.Path.Circle(sizeValue / 2, sizeValue / 2, radius);
  }, [props.baseSize]);
  if (!props.isRevealed || !identity) {
    return (
      <Animated.View collapsable={false} style={containerStyle}>
        <Animated.View style={ringStyle} />
        <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Group opacity={unrevealedOpacity}>
            <Group
              origin={shimmerOrigin}
              transform={shimmerTransform}
              opacity={0.9}
            >
              <Circle
                cx={center}
                cy={center}
                r={shimmerRadiusSk}
                style="stroke"
                strokeWidth={shimmerStrokeSk}
              >
                <SweepGradient
                  c={shimmerOrigin}
                  colors={[
                    "rgba(255,255,255,0)",
                    "rgba(255,255,255,0.85)",
                    "rgba(255,255,255,0)",
                  ]}
                />
              </Circle>
            </Group>
            <Path
              path={progressPath}
              style="stroke"
              strokeWidth={Math.max(2, props.baseSize * 0.08)}
              strokeCap="round"
              color="rgba(255,255,255,0.95)"
              start={0}
              end={holdProgress}
            />
          </Group>
        </Canvas>
      </Animated.View>
    );
  }

  return (
    <Animated.View collapsable={false} style={containerStyle}>
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Group opacity={revealOpacity} transform={revealTransform}>
          <TeamResultArtwork size={props.revealSize} team={identity.number} />
        </Group>
      </Canvas>

      <AppText className="text-7xl font-extrabold font-mono text-white text-center mt-3">
        {identity.number}
      </AppText>
    </Animated.View>
  );
}
