import { View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { AppText } from "../app-text";

const StyleAnimatedView = withUniwind(Animated.View);

export type PaginationIndicatorProps = {
  index: number;
  label: string;
  scrollX: SharedValue<number>;
  itemSize: number;
};

export function PaginationIndicator({
  index,
  scrollX,
  itemSize,
  label,
}: PaginationIndicatorProps) {
  const rBarStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollX.get() / itemSize,
        [index - 2, index - 1, index, index + 1, index + 2],
        [0.2, 0.5, 1, 0.5, 0.2],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scaleY: interpolate(
            scrollX.get() / itemSize,
            [index - 2, index - 1, index, index + 1, index + 2],
            [1, 1.4, 2, 1.4, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const rLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollX.get() / itemSize,
        [index - 0.5, index, index + 0.5],
        [0, 1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            scrollX.get() / itemSize,
            [index - 2, index - 1, index, index + 1, index + 2],
            [1, 1.4, 2, 1.4, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <View className="flex-row items-center h-8 my-1">
      <StyleAnimatedView
        className="w-[2px] h-3 bg-foreground"
        style={[
          {
            transformOrigin: ["50%", "100%", 0],
          },
          rBarStyle,
        ]}
      />
      <StyleAnimatedView className="absolute left-4" style={rLabelStyle}>
        <AppText className="text-foreground text-lg font-normal">
          {label}
        </AppText>
      </StyleAnimatedView>
    </View>
  );
}
