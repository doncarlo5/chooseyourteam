import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import { AntDesign } from "@expo/vector-icons";
import { useLingui } from "@lingui/react/macro";
import { Button, cn } from "heroui-native";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { type SharedValue, useSharedValue } from "react-native-reanimated";

export default function AllocationBackButton(props: {
  rect: SharedValue<TouchRect>;
  isDisabled: boolean;
  onPress: () => void;
}) {
  const { t } = useLingui();
  const buttonRef = useRef<View>(null);
  const blurIntensity = useSharedValue(40);
  const { theme } = useGameTheme();

  return (
    <Button
      size="md"
      className={cn(
        "absolute top-16 left-6 z-10 border rounded-full size-12 items-center justify-center px-0 overflow-hidden",
        theme.chrome.controlClassName,
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
      isDisabled={props.isDisabled}
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
        tint={theme.chrome.controlBlurTint}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className={cn(theme.chrome.controlOverlayClassName)}
      />
      <Button.Label>
        <AntDesign
          name="close"
          size={20}
          color={theme.chrome.controlIconColor}
        />
      </Button.Label>
    </Button>
  );
}
