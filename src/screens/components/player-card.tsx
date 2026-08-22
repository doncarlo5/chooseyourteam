import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import type { PlayerCardProps } from "@/src/helpers/types/home-screen";
import { msg, plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react";
import { useLingui } from "@lingui/react/macro";
import { Card, PressableFeedback, cn } from "heroui-native";
import { createElement } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useSharedValue,
} from "react-native-reanimated";

function TeamCountLabel(props: { count: number }) {
  const { theme } = useGameTheme();
  const descriptor = msg({
    comment:
      "Visible team count. Keep number and unit placeholders so their separate styles are preserved.",
    message: plural(props.count, {
      one: "<number>#</number><unit>team</unit>",
      other: "<number>#</number><unit>teams</unit>",
    }),
  });

  return createElement(Trans, {
    ...descriptor,
    components: {
      number: (
        <Card.Title
          className={cn(
            "text-5xl font-extrabold leading-none",
            theme.chrome.primaryTextClassName,
          )}
        />
      ),
      unit: (
        <Card.Description
          className={cn(
            "pl-0.5 leading-none",
            theme.chrome.cardSecondaryTextClassName,
          )}
        />
      ),
    },
  });
}

export function PlayerCard(props: PlayerCardProps) {
  const { t } = useLingui();
  const { theme } = useGameTheme();
  const blurIntensity = useSharedValue(40);
  const accessibilityLabel = t({
    comment: "Accessibility label for choosing a number of teams",
    message: plural(props.count, {
      one: "Select # team",
      other: "Select # teams",
    }),
  });

  return (
    <Animated.View
      entering={FadeInDown.duration(300)
        .delay(props.index * 100)
        .easing(Easing.out(Easing.ease))}
      className="w-1/2 px-2 mb-4"
      collapsable={false}
    >
      <PressableFeedback
        onPress={props.onPress}
        isDisabled={props.isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={cn("w-full rounded-3xl", theme.chrome.cardActiveClassName)}
        animation={{
          scale: {
            value: 1.03,
            timingConfig: { duration: 170 },
          },
        }}
      >
        <Card
          className={cn(
            "p-0 rounded-3xl overflow-hidden shadow-sm shadow-black/10",
            "border-2",
            theme.chrome.cardClassName,
            props.isDisabled && "opacity-50",
          )}
        >
          <AnimatedBlurView
            blurIntensity={blurIntensity}
            tint={theme.chrome.controlBlurTint}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            className={cn(theme.chrome.cardOverlayClassName)}
          />
          <Card.Body className="h-10" />
          <Card.Footer className="px-3 pb-4 flex-row items-end">
            <View className="flex-1">
              <TeamCountLabel count={props.count} />
            </View>
          </Card.Footer>
        </Card>
      </PressableFeedback>
    </Animated.View>
  );
}

export default PlayerCard;
