import { View } from "react-native";
import { AppText } from "../../../components/app-text";
import type { FrozenDot } from "../../../helpers/types/home-screen";

const REVEAL_CIRCLE_SIZE = 150;

export default function FrozenDotsLayer(props: { dots: FrozenDot[] }) {
  const ringThickness = Math.max(2, REVEAL_CIRCLE_SIZE * 0.08);
  const innerSize = REVEAL_CIRCLE_SIZE * 0.73;

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
          <View
            style={{
              position: "absolute",
              width: REVEAL_CIRCLE_SIZE,
              height: REVEAL_CIRCLE_SIZE,
              borderRadius: REVEAL_CIRCLE_SIZE / 2,
              borderWidth: ringThickness,
              borderColor: dot.color,
              backgroundColor: "transparent",
            }}
          />
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
