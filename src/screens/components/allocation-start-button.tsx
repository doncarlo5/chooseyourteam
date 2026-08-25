import { AppText } from "@/src/components/app-text";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

export function AllocationStartButton(props: {
  accentColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      testID="start-button"
      style={(state) => [
        styles.button,
        {
          opacity: state.pressed ? 0.82 : 1,
          transform: [{ scale: state.pressed ? 0.97 : 1 }],
        },
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox="0 0 300 86"
          preserveAspectRatio="none"
        >
          <Polygon
            points="19,2 281,2 298,19 298,67 281,84 19,84 2,67 2,19"
            fill={props.accentColor}
            fillOpacity={0.86}
            stroke="rgba(255,255,255,0.88)"
            strokeWidth={4}
            strokeLinejoin="miter"
          />
          <Polygon
            points="24,10 276,10 290,24 290,62 276,76 24,76 10,62 10,24"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1.5}
          />
        </Svg>
      </View>
      <AppText style={styles.label}>{props.label.toLocaleUpperCase()}</AppText>
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
  label: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2.5,
    lineHeight: 31,
    textAlign: "center",
  },
});
