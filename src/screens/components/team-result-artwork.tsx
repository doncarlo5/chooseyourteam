import { getTeamIdentity, type TeamNumber } from "@/src/domain/team-identity";
import { buildShapePath } from "@/src/screens/utils/dot-shapes";
import {
  Circle,
  Group,
  Paint,
  Path,
  RadialGradient,
  vec,
} from "@shopify/react-native-skia";
import { useMemo } from "react";

export function TeamResultArtwork(props: { size: number; team: TeamNumber }) {
  const identity = getTeamIdentity(props.team);
  const geometry = useMemo(() => {
    const ringThickness = Math.max(2, props.size * 0.08);
    const stickerStroke = Math.max(1.5, ringThickness * 0.35);

    return {
      path: buildShapePath(props.size, identity.shape, ringThickness),
      ringThickness,
      outerStroke: ringThickness + stickerStroke,
      center: props.size / 2,
      baseRadius: props.size * 0.365,
      highlightCenter: vec(props.size * 0.32, props.size * 0.24),
      highlightRadius: props.size * 0.55,
      shadowCenter: vec(props.size * 0.72, props.size * 0.78),
      shadowRadius: props.size * 0.7,
      rimWidth: Math.max(1.5, props.size * 0.055),
      rimGradientRadius: props.size * 0.95,
    };
  }, [identity.shape, props.size]);

  return (
    <>
      <Path
        path={geometry.path}
        style="stroke"
        strokeWidth={geometry.outerStroke}
        color="rgba(255,255,255,0.95)"
      />
      <Path path={geometry.path} color={identity.color} />
      <Path
        path={geometry.path}
        style="stroke"
        strokeWidth={geometry.ringThickness}
        color={identity.color}
      />
      <Group clip={geometry.path}>
        <Circle
          cx={geometry.center}
          cy={geometry.center}
          r={geometry.baseRadius}
        >
          <RadialGradient
            c={geometry.shadowCenter}
            r={geometry.shadowRadius}
            colors={[identity.color, "rgba(255,255,255,0)"]}
          />
        </Circle>
        <Circle
          cx={geometry.center}
          cy={geometry.center}
          r={geometry.baseRadius}
        >
          <RadialGradient
            c={geometry.highlightCenter}
            r={geometry.highlightRadius}
            colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
          />
        </Circle>
        <Circle
          cx={geometry.center}
          cy={geometry.center}
          r={geometry.baseRadius - geometry.rimWidth / 2}
        >
          <Paint style="stroke" strokeWidth={geometry.rimWidth}>
            <RadialGradient
              c={geometry.highlightCenter}
              r={geometry.rimGradientRadius}
              colors={[
                "rgba(255,255,255,0.45)",
                "rgba(255,255,255,0.10)",
                "rgba(255,255,255,0)",
              ]}
            />
          </Paint>
        </Circle>
      </Group>
    </>
  );
}
