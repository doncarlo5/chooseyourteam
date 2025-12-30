import { AppText } from "@/src/components/app-text";
import { cn } from "heroui-native";
import { View } from "react-native";

export default function RoundScreen(props: {
  fingersCount: number;
  touchCount: number;
  isActive: boolean;
  isFrozen: boolean;
  allowOverExpected: boolean;
}) {
  const waitingLabel = "Waiting for";
  const numberLabel = String(props.fingersCount);
  const fingersLabel = props.fingersCount === 1 ? "finger" : "fingers";
  const shouldShowLabel =
    !props.isFrozen &&
    (!props.isActive ||
      (props.allowOverExpected
        ? props.touchCount < props.fingersCount
        : props.touchCount !== props.fingersCount));

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="items-center gap-3">
        {shouldShowLabel ? (
          <View className="items-center">
            <AppText
              className={cn("text-3xl font-semibold text-center leading-none text-black/20")}
            >
              {waitingLabel}
            </AppText>
            <AppText
              className={cn(
                "text-6xl font-semibold text-center leading-none mt-3 text-black/25"
              )}
            >
              {numberLabel}
            </AppText>
            <AppText
              className={cn("text-3xl font-semibold text-center leading-none text-black/20")}
            >
              {fingersLabel}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}
