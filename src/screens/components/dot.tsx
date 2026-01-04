import { AppText } from "@/src/components/app-text";
import type { DotProps } from "@/src/helpers/types/home-screen";
import {
  Canvas,
  Circle,
  Group,
  Paint,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const GLASS_RING = "rgba(255,255,255,0.9)";

export default function Dot(props: DotProps) {
  const progress = useSharedValue(props.isRevealed ? 1 : 0);
  const size = useSharedValue(
    props.isRevealed ? props.revealSize : props.baseSize
  );

  useEffect(() => {
    progress.value = withTiming(props.isRevealed ? 1 : 0, { duration: 200 });
    size.value = withTiming(
      props.isRevealed ? props.revealSize : props.baseSize,
      {
        duration: 200,
      }
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
        [GLASS_RING, props.revealColor]
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
      // IMPORTANT: no solid white fill at the start
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["#FFFFFF", props.revealColor]
      ),
    };
  });

  const revealOpacity = useDerivedValue(() => progress.value);
  const baseRadius = useDerivedValue(() => size.value * 0.365);
  const center = useDerivedValue(() => size.value / 2);

  // Make these reactive to the animated size
  const ringThicknessSk = useDerivedValue(() => Math.max(2, size.value * 0.08));
  const stickerStrokeSk = useDerivedValue(() =>
    Math.max(1.5, ringThicknessSk.value * 0.35)
  );
  const outerStrokeSk = useDerivedValue(
    () => ringThicknessSk.value + stickerStrokeSk.value
  );
  const ringRadiusSk = useDerivedValue(
    () => size.value / 2 - ringThicknessSk.value
  );

  const highlightCenter = useDerivedValue(() =>
    vec(size.value * 0.32, size.value * 0.24)
  );
  const highlightRadius = useDerivedValue(() => size.value * 0.55);

  const shadowCenter = useDerivedValue(() =>
    vec(size.value * 0.72, size.value * 0.78)
  );
  const shadowRadius = useDerivedValue(() => size.value * 0.7);

  // Glass rim (stroke)
  const rimWidth = useDerivedValue(() => Math.max(1.5, size.value * 0.055));
  const rimRadius = useDerivedValue(
    () => baseRadius.value - rimWidth.value / 2
  );
  const rimGradientRadius = useDerivedValue(() => size.value * 0.95);

  if (!props.isRevealed || !props.label) {
    return (
      <Animated.View collapsable={false} style={containerStyle}>
        <Animated.View style={ringStyle} />
      </Animated.View>
    );
  }

  return (
    <Animated.View collapsable={false} style={containerStyle}>
      <Animated.View style={dotStyle} />

      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Group opacity={revealOpacity}>
          {/* sticker white rim */}
          <Circle
            cx={center}
            cy={center}
            r={ringRadiusSk}
            style="stroke"
            strokeWidth={outerStrokeSk}
            color="rgba(255,255,255,0.95)"
          />
          {/* colored outer fill */}
          <Circle
            cx={center}
            cy={center}
            r={ringRadiusSk}
            color={props.revealColor}
          />
          {/* colored border */}
          <Circle
            cx={center}
            cy={center}
            r={ringRadiusSk}
            style="stroke"
            strokeWidth={ringThicknessSk}
            color={props.revealColor}
          />

          {/* your existing inner shading */}
          <Circle cx={center} cy={center} r={baseRadius}>
            <RadialGradient
              c={shadowCenter}
              r={shadowRadius}
              colors={[props.revealColor, "rgba(255,255,255,0)"]}
            />
          </Circle>

          <Circle cx={center} cy={center} r={baseRadius}>
            <RadialGradient
              c={highlightCenter}
              r={highlightRadius}
              colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
            />
          </Circle>
          <Circle cx={center} cy={center} r={rimRadius}>
            <Paint style="stroke" strokeWidth={rimWidth}>
              <RadialGradient
                c={highlightCenter}
                r={rimGradientRadius}
                colors={[
                  "rgba(255,255,255,0.45)",
                  "rgba(255,255,255,0.10)",
                  "rgba(255,255,255,0)",
                ]}
              />
            </Paint>
          </Circle>
        </Group>
      </Canvas>

      <AppText className="text-7xl font-extrabold font-mono text-white text-center mt-3">
        {props.label}
      </AppText>
    </Animated.View>
  );
}
