import { Host } from "@expo/ui";
import {
  Button,
  Column,
  Shape,
  Text,
} from "@expo/ui/jetpack-compose";
import { size, testID } from "@expo/ui/jetpack-compose/modifiers";

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
        shape={Shape.Circle({})}
        modifiers={[size(116, 116), testID("start-button")]}
        onClick={props.onPress}
      >
        <Column
          horizontalAlignment="center"
          verticalArrangement={{ spacedBy: 4 }}
        >
          <Text style={{ fontSize: 30, lineHeight: 32 }}>▶</Text>
          <Text style={{ fontSize: 16, fontWeight: "700" }}>
            {props.label}
          </Text>
        </Column>
      </Button>
    </Host>
  );
}
