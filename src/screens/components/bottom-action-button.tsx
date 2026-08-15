import { AnimatedBlurView } from "@/src/components/animated-blur-view";
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

  return (
    <Button
      ref={props.buttonRef}
      size="md"
      className={cn(
        "absolute bottom-10 z-10 size-12 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-gray-100/40 px-0 active:bg-gray-100/80 active:text-white",
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
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className={cn("bg-white/15")}
      />
      <Button.Label>
        <Ionicons name={props.iconName} size={20} color="rgba(0,0,0,0.8)" />
      </Button.Label>
    </Button>
  );
}
