import {
  Circle,
  Group,
  Path,
  Skia,
  SweepGradient,
  vec,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { useDerivedValue } from "react-native-reanimated";
import {
  SharedTeamResultArtwork,
  TeamResultArtwork,
} from "../screens/components/team-result-artwork";
import type {
  GameThemeArtwork,
  UnrevealedDotArtworkProps,
} from "./game-theme-types";

function DesertLagoonUnrevealedDot(props: UnrevealedDotArtworkProps) {
  const ringThickness = props.size * 0.08;
  const ringRadius = props.size / 2 - ringThickness / 2;
  const progressPath = useMemo(
    () =>
      Skia.Path.Circle(
        props.size / 2,
        props.size / 2,
        props.size / 2 - ringThickness,
      ),
    [props.size, ringThickness],
  );
  const shimmerTransform = useDerivedValue(() => [
    { rotate: (props.clock.get() / 1200) * Math.PI * 3 },
  ]);

  return (
    <>
      <Circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={ringRadius}
        style="stroke"
        strokeWidth={ringThickness}
        color="rgba(255,255,255,0.8)"
      />
      <Group
        origin={vec(props.size / 2, props.size / 2)}
        transform={shimmerTransform}
        opacity={0.9}
      >
        <Circle
          cx={props.size / 2}
          cy={props.size / 2}
          r={ringRadius - ringThickness * 0.45}
          style="stroke"
          strokeWidth={ringThickness * 0.99}
        >
          <SweepGradient
            c={vec(props.size / 2, props.size / 2)}
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.85)",
              "rgba(255,255,255,0)",
            ]}
          />
        </Circle>
      </Group>
      <Path
        path={progressPath}
        style="stroke"
        strokeWidth={ringThickness}
        strokeCap="round"
        color="rgba(255,255,255,0.95)"
        start={0}
        end={props.holdProgress}
      />
    </>
  );
}

export const desertLagoonArtwork: GameThemeArtwork = {
  UnrevealedDot: DesertLagoonUnrevealedDot,
  RevealedDot: TeamResultArtwork,
  SharedRevealedDot: SharedTeamResultArtwork,
};
