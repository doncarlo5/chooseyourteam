import { AppText } from "@/src/components/app-text";
import type { TeamNumber } from "@/src/domain/team-identity";
import { useLingui } from "@lingui/react/macro";
import { cn } from "heroui-native";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import type { ComponentProps } from "react";
import { Platform, type StyleProp, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

export default function RevealedPlayerLabel(
  props:
    | {
        team: TeamNumber;
        style: ComponentProps<typeof Animated.View>["style"];
        isAccessibilityVisible?: boolean;
        isVisuallyHidden?: boolean;
        isAnimated: true;
      }
    | {
        team: TeamNumber;
        style: StyleProp<ViewStyle>;
        isAccessibilityVisible?: boolean;
        isVisuallyHidden?: boolean;
        isAnimated?: false;
      },
) {
  const { t } = useLingui();
  const { theme } = useGameTheme();
  const isAccessibilityVisible = props.isAccessibilityVisible ?? true;

  const content = (
    <AppText
      className={cn(
        "text-7xl font-extrabold font-mono text-center",
        Platform.OS !== "android" && "mt-3",
        theme.chrome.revealedLabelClassName,
      )}
      style={[
        theme.typography.number,
        theme.chrome.revealedLabelStyle,
        props.isVisuallyHidden ? { opacity: 0 } : undefined,
      ]}
    >
      {props.team}
    </AppText>
  );
  const accessibilityProps = {
    "aria-hidden": !isAccessibilityVisible,
    accessible: isAccessibilityVisible,
    accessibilityElementsHidden: !isAccessibilityVisible,
    importantForAccessibility: isAccessibilityVisible
      ? ("yes" as const)
      : ("no-hide-descendants" as const),
    accessibilityLabel: t`Player assigned to Team ${props.team}`,
  };

  if (!props.isAnimated) {
    return (
      <View pointerEvents="none" {...accessibilityProps} style={props.style}>
        {content}
      </View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      {...accessibilityProps}
      style={props.style}
    >
      {content}
    </Animated.View>
  );
}
