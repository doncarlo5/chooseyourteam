import { Button, Host } from "@expo/ui";

export function AllocationStartButton(props: {
  accentColor: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Host
      seedColor={props.accentColor}
      style={{ alignSelf: "center", height: 58, marginTop: 20, width: 260 }}
    >
      <Button
        label={props.label}
        variant="filled"
        style={{ height: 52, width: 260 }}
        onPress={props.onPress}
        testID="start-button"
      />
    </Host>
  );
}
