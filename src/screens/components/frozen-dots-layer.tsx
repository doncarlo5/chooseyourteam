import { AppText } from "@/src/components/app-text";
import type { FrozenDot } from "@/src/helpers/types/home-screen";
import { Canvas, Circle } from "@shopify/react-native-skia";
import { View } from "react-native";

const REVEAL_CIRCLE_SIZE = 150;

export default function FrozenDotsLayer(props: { dots: FrozenDot[] }) {
  const ringThickness = Math.max(2, REVEAL_CIRCLE_SIZE * 0.08);
  const stickerStroke = Math.max(1.5, ringThickness * 0.35);
  const innerSize = REVEAL_CIRCLE_SIZE * 0.73;

  const cx = REVEAL_CIRCLE_SIZE / 2;
  const cy = REVEAL_CIRCLE_SIZE / 2;

  // Same idea as your shapePath: inset the “base path” a bit
  const ringRadius = REVEAL_CIRCLE_SIZE / 2 - ringThickness;

  return (
    <View className="absolute inset-0" pointerEvents="none">
      {props.dots.map((dot, index) => (
        <View
          key={`${dot.x}-${dot.y}-${index}`}
          style={{
            position: "absolute",
            left: dot.x - REVEAL_CIRCLE_SIZE / 2,
            top: dot.y - REVEAL_CIRCLE_SIZE / 2,
            width: REVEAL_CIRCLE_SIZE,
            height: REVEAL_CIRCLE_SIZE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Canvas
            pointerEvents="none"
            style={{
              position: "absolute",
              width: REVEAL_CIRCLE_SIZE,
              height: REVEAL_CIRCLE_SIZE,
            }}
          >
            <Circle
              cx={cx}
              cy={cy}
              r={ringRadius}
              style="stroke"
              strokeWidth={ringThickness + stickerStroke}
              color="rgba(255,255,255,0.95)"
            />
            <Circle cx={cx} cy={cy} r={ringRadius} color={dot.color} />
            <Circle
              cx={cx}
              cy={cy}
              r={ringRadius}
              style="stroke"
              strokeWidth={ringThickness}
              color={dot.color}
            />
          </Canvas>

          {/* inner disk stays the same */}
          <View
            style={{
              position: "absolute",
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: dot.color,
            }}
          />

          {dot.label ? (
            <AppText className="text-7xl font-extrabold font-mono text-white text-center mt-3">
              {dot.label}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}
