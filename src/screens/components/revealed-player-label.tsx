import { AppText } from "@/src/components/app-text";
import type { TeamNumber } from "@/src/domain/team-identity";
import { useLingui } from "@lingui/react/macro";
import type { ComponentProps } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

export default function RevealedPlayerLabel(
  props:
    | {
        team: TeamNumber;
        style: ComponentProps<typeof Animated.View>["style"];
        isAccessibilityVisible?: boolean;
        isAnimated: true;
      }
    | {
        team: TeamNumber;
        style: StyleProp<ViewStyle>;
        isAccessibilityVisible?: boolean;
        isAnimated?: false;
      },
) {
  const { t } = useLingui();
  const isAccessibilityVisible = props.isAccessibilityVisible ?? true;

  const content = (
    <AppText className="text-7xl font-extrabold font-mono text-white text-center mt-3">
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
