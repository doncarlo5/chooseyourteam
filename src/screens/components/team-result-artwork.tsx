import {
  getTeamIdentity,
  TEAM_IDENTITIES,
  type TeamNumber,
  type TeamShape,
} from "@/src/domain/team-identity";
import { buildShapePath } from "@/src/screens/utils/dot-shapes";
import {
  Circle,
  Group,
  Paint,
  Path,
  RadialGradient,
  Skia,
  type SkPath,
  vec,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";

const buildArtworkGeometry = (
  size: number,
  shape: TeamShape,
  ringThickness: number,
) => {
  const stickerStroke = Math.max(1.5, ringThickness * 0.35);
  return {
    path: buildShapePath(size, shape, ringThickness),
    ringThickness,
    outerStroke: ringThickness + stickerStroke,
    center: size / 2,
    baseRadius: size * 0.365,
    highlightCenter: vec(size * 0.32, size * 0.24),
    highlightRadius: size * 0.55,
    shadowCenter: vec(size * 0.72, size * 0.78),
    shadowRadius: size * 0.7,
    rimWidth: Math.max(1.5, size * 0.055),
    rimGradientRadius: size * 0.95,
  };
};

function TeamArtworkLayers(props: {
  geometry: ReturnType<typeof buildArtworkGeometry>;
  path: SkPath | SharedValue<SkPath>;
  color: string | SharedValue<string>;
  shadowColors: string[] | SharedValue<string[]>;
}) {
  return (
    <>
      <Path
        path={props.path}
        style="stroke"
        strokeWidth={props.geometry.outerStroke}
        color="rgba(255,255,255,0.95)"
      />
      <Path path={props.path} color={props.color} />
      <Path
        path={props.path}
        style="stroke"
        strokeWidth={props.geometry.ringThickness}
        color={props.color}
      />
      <Group clip={props.path}>
        <Circle
          cx={props.geometry.center}
          cy={props.geometry.center}
          r={props.geometry.baseRadius}
        >
          <RadialGradient
            c={props.geometry.shadowCenter}
            r={props.geometry.shadowRadius}
            colors={props.shadowColors}
          />
        </Circle>
        <Circle
          cx={props.geometry.center}
          cy={props.geometry.center}
          r={props.geometry.baseRadius}
        >
          <RadialGradient
            c={props.geometry.highlightCenter}
            r={props.geometry.highlightRadius}
            colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
          />
        </Circle>
        <Circle
          cx={props.geometry.center}
          cy={props.geometry.center}
          r={props.geometry.baseRadius - props.geometry.rimWidth / 2}
        >
          <Paint style="stroke" strokeWidth={props.geometry.rimWidth}>
            <RadialGradient
              c={props.geometry.highlightCenter}
              r={props.geometry.rimGradientRadius}
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

export function TeamResultArtwork(props: { size: number; team: TeamNumber }) {
  const identity = getTeamIdentity(props.team);
  const geometry = useMemo(() => {
    const ringThickness = Math.max(2, props.size * 0.08);
    return buildArtworkGeometry(props.size, identity.shape, ringThickness);
  }, [identity.shape, props.size]);

  return (
    <TeamArtworkLayers
      geometry={geometry}
      path={geometry.path}
      color={identity.color}
      shadowColors={[identity.color, "rgba(255,255,255,0)"]}
    />
  );
}

export function SharedTeamResultArtwork(props: {
  size: number;
  team: SharedValue<number>;
}) {
  const ringThickness = Math.max(2, props.size * 0.08);
  const geometries = useMemo(
    () =>
      TEAM_IDENTITIES.map((identity) =>
        buildArtworkGeometry(props.size, identity.shape, ringThickness),
      ),
    [props.size, ringThickness],
  );
  const emptyPath = useMemo(() => Skia.Path.Make(), []);
  const path = useDerivedValue(() =>
    props.team.get() > 0
      ? geometries[Math.min(geometries.length - 1, props.team.get() - 1)].path
      : emptyPath,
  );
  const color = useDerivedValue<string>(() =>
    props.team.get() > 0
      ? (TEAM_IDENTITIES[
          Math.min(TEAM_IDENTITIES.length - 1, props.team.get() - 1)
        ]?.color ?? "rgba(0,0,0,0)")
      : "rgba(0,0,0,0)",
  );
  const shadowColors = useDerivedValue(() => [
    color.get(),
    "rgba(255,255,255,0)",
  ]);

  return (
    <TeamArtworkLayers
      geometry={geometries[0]}
      path={path}
      color={color}
      shadowColors={shadowColors}
    />
  );
}
