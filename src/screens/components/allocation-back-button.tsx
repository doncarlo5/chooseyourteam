import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import { AntDesign } from "@expo/vector-icons";
import { useLingui } from "@lingui/react/macro";
import { Button, cn } from "heroui-native";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";

export default function AllocationBackButton(props: {
  rect: SharedValue<TouchRect>;
  onPress: () => void;
}) {
  const { t } = useLingui();
  const buttonRef = useRef<View>(null);
  const blurIntensity = useSharedValue(40);

  return (
    <Button
      size="md"
      className={cn(
        "absolute top-16 left-6 z-10 border border-white/60 rounded-full size-12 items-center justify-center px-0 overflow-hidden bg-gray-100/40 active:bg-gray-100/80 active:text-white",
      )}
      animation={{
        scale: {
          value: 1.03,
          timingConfig: { duration: 170 },
        },
        highlight: {
          backgroundColor: { value: "transparent" },
          opacity: { value: [0, 0] },
        },
      }}
      accessibilityRole="button"
      accessibilityLabel={t({
        context: "return from allocation to team selection",
        message: "Close",
      })}
      accessibilityHint={t`Returns to team selection`}
      onPress={props.onPress}
      onLayout={() => {
        buttonRef.current?.measureInWindow((x, y, width, height) => {
          props.rect.set({ x, y, width, height, isReady: true });
        });
      }}
      ref={buttonRef}
      isIconOnly
    >
      <AnimatedBlurView
        blurIntensity={blurIntensity}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className="bg-white/15"
      />
      <Button.Label>
        <AntDesign name="close" size={20} color="rgba(0,0,0,0.8)" />
      </Button.Label>
    </Button>
  );
}
