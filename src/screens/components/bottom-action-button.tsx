import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { Ionicons } from "@expo/vector-icons";
import { Button, cn } from "heroui-native";
import type { ComponentProps, Ref } from "react";
import { StyleSheet, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

export default function BottomActionButton(props: {
  accessibilityHint: string;
  accessibilityLabel: string;
  buttonRef?: Ref<View>;
  iconName: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  side: "left" | "right";
}) {
  const blurIntensity = useSharedValue(40);
  const { theme } = useGameTheme();

  return (
    <Button
      ref={props.buttonRef}
      size="md"
      className={cn(
        "absolute bottom-10 z-10 size-12 items-center justify-center overflow-hidden rounded-full border px-0",
        theme.chrome.controlClassName,
        props.side === "left" ? "left-6" : "right-6",
      )}
      feedbackVariant="scale"
      animation={{
        scale: {
          value: 0.96,
          timingConfig: { duration: 170 },
        },
      }}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityHint={props.accessibilityHint}
      onPress={props.onPress}
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
        <Ionicons
          name={props.iconName}
          size={20}
          color={theme.chrome.controlIconColor}
        />
      </Button.Label>
    </Button>
  );
}
