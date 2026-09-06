import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { H } from "@/src/screens/utils/helper";
import { AppText } from "@/src/components/app-text";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

export function AllocationStartButton(props: {
  label: string;
  onPress: () => void;
}) {
  const { theme } = useGameTheme();
  const handlePressIn = () => {
    void H.startPress();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      onPressIn={handlePressIn}
      testID="start-button"
      style={[styles.button, { borderRadius: theme.start.style.borderRadius }]}
    >
      {(state) => (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.face,
            theme.start.style,
            theme.start.variant !== "beveled" && {
              backgroundColor: theme.start.backgroundColor,
              borderColor: theme.start.borderColor,
            },
            state.pressed && theme.start.pressedStyle,
          ]}
        >
          {theme.start.variant === "beveled" ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Svg
                style={StyleSheet.absoluteFill}
                viewBox="0 0 300 86"
                preserveAspectRatio="none"
              >
                <Polygon
                  points="19,2 281,2 298,19 298,67 281,84 19,84 2,67 2,19"
                  fill={theme.start.backgroundColor}
                  fillOpacity={1}
                  stroke={theme.start.borderColor}
                  strokeWidth={4}
                  strokeLinejoin="miter"
                />
                <Polygon
                  points="24,10 276,10 290,24 290,62 276,76 24,76 10,62 10,24"
                  fill="none"
                  stroke={theme.start.borderColor}
                  strokeWidth={1.5}
                />
              </Svg>
            </View>
          ) : null}
          <AppText
            style={[
              styles.label,
              theme.typography.title,
              { color: theme.start.foregroundColor },
            ]}
          >
            {props.label.toLocaleUpperCase()}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "stretch",
    height: 86,
    justifyContent: "center",
    marginTop: 32,
  },
  face: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2.5,
    lineHeight: 31,
    textAlign: "center",
  },
});
