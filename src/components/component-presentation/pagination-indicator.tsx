import { View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";

const StyleAnimatedView = withUniwind(Animated.View);

const DOT_SIZE = 8;
const DOT_ACTIVE_SCALE = 1.45;
const DOT_INACTIVE_COLOR = "#8D8D8D";
const DOT_ACTIVE_COLOR = "#D6D6D6";

export function PaginationIndicator(props: {
  index: number;
  scrollX: SharedValue<number>;
  itemSize: number;
}) {
  const rDotStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        props.scrollX.get() / props.itemSize,
        [
          props.index - 2,
          props.index - 1,
          props.index,
          props.index + 1,
          props.index + 2,
        ],
        [0.2, 0.5, 1, 0.5, 0.2],
        Extrapolation.CLAMP
      ),
      backgroundColor: interpolateColor(
        props.scrollX.get() / props.itemSize,
        [props.index - 1, props.index, props.index + 1],
        [DOT_INACTIVE_COLOR, DOT_ACTIVE_COLOR, DOT_INACTIVE_COLOR]
      ),
      transform: [
        {
          scale: interpolate(
            props.scrollX.get() / props.itemSize,
            [
              props.index - 2,
              props.index - 1,
              props.index,
              props.index + 1,
              props.index + 2,
            ],
            [1, 1.15, DOT_ACTIVE_SCALE, 1.15, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  return (
    <View className="flex-row items-center h-8 my-1">
      <StyleAnimatedView
        style={[
          {
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            transformOrigin: ["50%", "50%", 0],
          },
          rDotStyle,
        ]}
      />
    </View>
  );
}
