import { AppText } from "@/src/components/app-text";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { Trans, useLingui } from "@lingui/react/macro";
import { cn } from "heroui-native";
import { Switch, View } from "react-native";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";

export default function PairingModeToggle(props: {
  isEnabled: boolean;
  onValueChange: (isEnabled: boolean) => void;
}) {
  const { t } = useLingui();
  const { theme } = useGameTheme();

  return (
    <Animated.View
      style={theme.surfaces.card}
      entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
      className={cn(
        "mt-3 min-h-14 w-full max-w-72 flex-row items-center justify-between rounded-2xl px-4 py-2",
        theme.chrome.pairingSurfaceClassName,
      )}
    >
      <View className={cn("mr-4 flex-1")}>
        <AppText
          style={theme.typography.body}
          className={cn(
            "text-[15px] font-semibold",
            theme.chrome.pairingPrimaryTextClassName,
          )}
        >
          <Trans>Pairing mode</Trans>
        </AppText>
        <AppText
          style={theme.typography.body}
          className={cn("text-xs", theme.chrome.pairingSecondaryTextClassName)}
        >
          {props.isEnabled ? (
            <Trans>On · players 2 + 3 together</Trans>
          ) : (
            <Trans>Off</Trans>
          )}
        </AppText>
      </View>
      <Switch
        accessibilityLabel={t`Pairing mode`}
        accessibilityHint={t`Keeps the second and third players on the same team when fair allocation allows it`}
        value={props.isEnabled}
        onValueChange={props.onValueChange}
        trackColor={theme.chrome.switchTrackColor}
        thumbColor={theme.chrome.switchThumbColor}
      />
    </Animated.View>
  );
}
