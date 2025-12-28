import type { PlayerCardProps } from "@/src/helpers/types/home-screen";
import { Card, PressableFeedback, cn, useThemeColor } from "heroui-native";
import { View } from "react-native";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";

export function PlayerCard({
  count,
  index,
  isDark,
  isDisabled,
  onPress,
  label = "teams",
}: PlayerCardProps) {
  const themeColorAccent = useThemeColor("accent");

  return (
    <Animated.View
      entering={FadeInDown.duration(300)
        .delay(index * 100)
        .easing(Easing.out(Easing.ease))}
      className="w-1/2 px-2 mb-4"
      collapsable={false}
    >
      <PressableFeedback
        onPress={onPress}
        isDisabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={`Select ${count} ${label}`}
        feedbackVariant="ripple"
        className="w-full rounded-3xl"
        animation={{
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
            isDark ? "bg-[#0E1217]" : "bg-white",
            isDisabled && "opacity-50"
          )}
        >
          <Card.Body className="h-10" />
          <Card.Footer className="px-3 pb-4 flex-row items-end gap-4">
            <View className="flex-1">
              <Card.Title
                className={cn(
                  "text-5xl font-extrabold ",
                  isDark ? "text-white" : "text-[#0B0B0B]"
                )}
              >
                {count}
              </Card.Title>
              <Card.Description className="pl-0.5 leading-none text-muted">
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
