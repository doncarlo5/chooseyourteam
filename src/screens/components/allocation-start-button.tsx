import { Button, Column, Host, Text } from "@expo/ui";

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
        variant="filled"
        style={{ borderRadius: 58, height: 116, width: 116 }}
        onPress={props.onPress}
        testID="start-button"
      >
        <Column alignment="center" spacing={4}>
          <Text textStyle={{ fontSize: 30, lineHeight: 32 }}>▶</Text>
          <Text textStyle={{ fontSize: 16, fontWeight: "700" }}>
            {props.label}
          </Text>
        </Column>
      </Button>
    </Host>
  );
}
