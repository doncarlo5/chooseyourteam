import { AppText } from "@/src/components/app-text";
import { cn } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { PlayerCard } from "./player-card";

const GROUP_OPTIONS = [2, 3, 4, 5];
const AnimatedAppText = Animated.createAnimatedComponent(AppText);

export default function TeamsSelection(props: {
  selectedTeams: number | null;
  onSelectTeams: (teams: number) => void;
}) {
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(12);

  const titleStyle = useAnimatedStyle(() => {
    return {
      opacity: titleOpacity.value,
      transform: [{ translateY: titleTranslateY.value }],
    };
  });

  useEffect(() => {
    titleOpacity.set(
      withTiming(1, {
        duration: 2000,
        easing: Easing.out(Easing.cubic),
      }),
    );
    titleTranslateY.set(
      withTiming(0, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [titleOpacity, titleTranslateY]);

  if (props.selectedTeams) return null;

  return (
    <View className={cn("flex-1 justify-center px-8 gap-10")}>
      <AnimatedAppText
        className="text-4xl font-extralight text-center"
        style={titleStyle}
      >
        Choose your team
      </AnimatedAppText>
      <View className="w-full">
        <View className="flex-row flex-wrap -mx-2">
          {GROUP_OPTIONS.map((count, index) => {
            return (
              <PlayerCard
                key={count}
                count={count}
                index={index}
                isDisabled={false}
                onPress={() => {
                  props.onSelectTeams(count);
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
