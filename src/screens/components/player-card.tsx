import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import type { PlayerCardProps } from "@/src/helpers/types/home-screen";
import { Card, PressableFeedback, cn, useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useSharedValue,
} from "react-native-reanimated";

export function PlayerCard(props: PlayerCardProps) {
  const themeColorAccent = useThemeColor("accent");
  const label = props.label ?? "teams";
  const blurIntensity = useSharedValue(40);

  return (
    <Animated.View
      entering={FadeInDown.duration(300)
        .delay(props.index * 100)
        .easing(Easing.out(Easing.ease))}
      className="w-1/2 px-2 mb-4"
      collapsable={false}
    >
      <PressableFeedback
        onPress={props.onPress}
        isDisabled={props.isDisabled}
        accessibilityRole="button"
        accessibilityLabel={`Select ${props.count} ${label}`}
        feedbackVariant="ripple"
        className="w-full rounded-3xl"
        animation={{
          scale: {
            timingConfig: { duration: 120 },
          },
          ripple: {
            backgroundColor: { value: themeColorAccent },
            opacity: { value: [0, 0.2, 0] },
            progress: { baseDuration: 600 },
          },
        }}
      >
        <Card
          className={cn(
            "p-0 rounded-3xl overflow-hidden shadow-sm shadow-black/10",
            "bg-white/10 border-2 border-white/30",
            props.isDisabled && "opacity-50"
          )}
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
          <Card.Body className="h-10" />
          <Card.Footer className="px-3 pb-4 flex-row items-end">
            <View className="flex-1">
              <Card.Title
                className={cn(
                  "text-5xl font-extrabold leading-none text-[#0B0B0B]"
                )}
              >
                {props.count}
              </Card.Title>
              <Card.Description className="pl-0.5 leading-none text-black/60">
                {label}
              </Card.Description>
            </View>
          </Card.Footer>
        </Card>
      </PressableFeedback>
    </Animated.View>
  );
}

export default PlayerCard;
