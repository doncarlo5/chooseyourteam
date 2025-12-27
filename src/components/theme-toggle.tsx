import { Ionicons } from "@expo/vector-icons";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { cn } from "heroui-native";
import { useRef, type FC } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, {
  FadeOut,
  ZoomIn,
  type SharedValue,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import type { TouchRect } from "../helpers/types/home-screen";
import { useAppTheme } from "../contexts/app-theme-context";

const StyledIonicons = withUniwind(Ionicons);

export const ThemeToggle: FC<{
  selectedTeams: number | null;
  toggleRectSv: SharedValue<TouchRect>;
}> = (props: {
  selectedTeams: number | null;
  toggleRectSv: SharedValue<TouchRect>;
}) => {
  const toggleRef = useRef<View>(null);
  const { toggleTheme, isLight } = useAppTheme();

  const isLGAvailable = isLiquidGlassAvailable();

  if (props.selectedTeams) return null;

  return (
    <View
      ref={toggleRef}
      className="flex-row items-center gap-2 rounded-full"
      onLayout={() => {
        toggleRef.current?.measureInWindow((x, y, width, height) => {
          props.toggleRectSv.value = {
            x,
            y,
            width,
            height,
            isReady: true,
          };
        });
      }}
    >
      <Pressable
        onPress={() => {
          if (Platform.OS === "ios") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          toggleTheme();
        }}
        className={cn("p-4 ", isLGAvailable && "px-3 py-2")}
        hitSlop={8}
      >
        {isLight ? (
          <Animated.View key="moon" entering={ZoomIn} exiting={FadeOut}>
            <StyledIonicons name="moon" size={20} className="text-black" />
          </Animated.View>
        ) : (
          <Animated.View key="sun" entering={ZoomIn} exiting={FadeOut}>
            <StyledIonicons name="sunny" size={20} className="text-white" />
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
};
