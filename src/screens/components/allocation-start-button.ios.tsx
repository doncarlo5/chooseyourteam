import { Button, Host } from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { Platform } from "react-native";

const supportsLiquidGlass = Number.parseFloat(String(Platform.Version)) >= 26;

export function AllocationStartButton(props: {
  accentColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Host
      seedColor={props.accentColor}
      style={{ alignSelf: "center", height: 58, marginTop: 20, width: 280 }}
    >
      <Button
        label={props.label}
        systemImage="play.fill"
        onPress={props.onPress}
        modifiers={[
          frame({ width: 280, height: 52 }),
          buttonStyle(
            supportsLiquidGlass ? "glassProminent" : "borderedProminent",
          ),
          buttonBorderShape("capsule"),
          controlSize("large"),
          tint(props.accentColor),
          accessibilityIdentifier("start-button"),
        ]}
      />
    </Host>
  );
}
