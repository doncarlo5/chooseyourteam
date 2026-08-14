import { AppText } from "@/src/components/app-text";
import { cn } from "heroui-native";
import { Switch, View } from "react-native";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";

export default function InseparableToggle(props: {
  isEnabled: boolean;
  onValueChange: (isEnabled: boolean) => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
      className={cn(
        "mt-3 min-h-14 w-full max-w-72 flex-row items-center justify-between rounded-2xl bg-white/70 px-4 py-2",
      )}
    >
      <View className={cn("mr-4 flex-1")}>
        <AppText className={cn("text-[15px] font-semibold text-black/80")}>
          Inséparable
        </AppText>
        <AppText className={cn("text-xs text-black/50")}>
          {props.isEnabled ? "On · players 2 + 3 together" : "Off"}
        </AppText>
      </View>
      <Switch
        accessibilityLabel="Inséparable"
        accessibilityHint="Keeps the second and third players on the same team when fair allocation allows it"
        value={props.isEnabled}
        onValueChange={props.onValueChange}
      />
    </Animated.View>
  );
}
