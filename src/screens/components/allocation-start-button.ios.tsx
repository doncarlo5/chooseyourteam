import { Host } from "@expo/ui";
import { Button, Image, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityIdentifier,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  font,
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
      style={{ alignSelf: "center", height: 124, marginTop: 20, width: 124 }}
    >
      <Button
        onPress={props.onPress}
        modifiers={[
          buttonStyle(
            supportsLiquidGlass ? "glassProminent" : "borderedProminent",
          ),
          buttonBorderShape("circle"),
          controlSize("extraLarge"),
          tint(props.accentColor),
          accessibilityIdentifier("start-button"),
        ]}
      >
        <VStack
          alignment="center"
          spacing={5}
          modifiers={[frame({ width: 88, height: 88 })]}
        >
          <Image systemName="play.fill" size={32} />
          <Text modifiers={[font({ size: 17, weight: "semibold" })]}>
            {props.label}
          </Text>
        </VStack>
      </Button>
    </Host>
  );
}
