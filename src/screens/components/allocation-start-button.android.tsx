import { Button, Host, Text } from "@expo/ui/jetpack-compose";
import {
  fillMaxWidth,
  height,
  testID,
} from "@expo/ui/jetpack-compose/modifiers";

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
        modifiers={[fillMaxWidth(), height(52), testID("start-button")]}
        onClick={props.onPress}
      >
        <Text style={{ fontWeight: "700" }}>{props.label}</Text>
      </Button>
    </Host>
  );
}
