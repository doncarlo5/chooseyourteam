import {
  Blur,
  Circle,
  Group,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import type {
  GameThemeArtwork,
  RevealedDotArtworkProps,
  SharedRevealedDotArtworkProps,
  UnrevealedDotArtworkProps,
} from "./game-theme-types";
import {
  getNeonArenaTeamEncoding,
  NEON_ARENA_TEAM_ENCODINGS,
} from "./neon-arena-team-encoding";

const PINK = "#FF2CCB";
const BLUE = "#286BFF";
const WHITE = "#FFFFFF";
const DARK_CENTER = "rgba(3,0,8,0.94)";
const REVEALED_DARK_CENTER = "#030008";

function makeCirclePath(size: number, radius: number) {
  return Skia.Path.Circle(size / 2, size / 2, radius);
}

function NeonRings(props: { size: number }) {
  const outerRadius = props.size * 0.43;
  const innerRadius = props.size * 0.35;
  const outerPath = useMemo(
    () => makeCirclePath(props.size, outerRadius),
    [outerRadius, props.size],
  );
  const innerPath = useMemo(
    () => makeCirclePath(props.size, innerRadius),
    [innerRadius, props.size],
  );
  const glowWidth = Math.max(7, props.size * 0.065);
  const coreWidth = Math.max(2, props.size * 0.018);

  return (
    <>
      <Circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={props.size * 0.47}
        color={DARK_CENTER}
      />
      <Path
        path={outerPath}
        style="stroke"
        strokeWidth={glowWidth}
        color="rgba(40,107,255,0.55)"
      >
        <Blur blur={props.size * 0.055} mode="decal" />
      </Path>
      <Path
        path={outerPath}
        style="stroke"
        strokeWidth={coreWidth}
        color={BLUE}
      />
      <Path
        path={innerPath}
        style="stroke"
        strokeWidth={glowWidth}
        color="rgba(255,44,203,0.55)"
      >
        <Blur blur={props.size * 0.05} mode="decal" />
      </Path>
      <Path
        path={innerPath}
        style="stroke"
        strokeWidth={coreWidth}
        color={PINK}
      />
    </>
  );
}

function NeonArenaUnrevealedDot(props: UnrevealedDotArtworkProps) {
  return (
    <>
      <NeonRings size={props.size} />
      <NeonArenaUnrevealedOverlay {...props} />
    </>
  );
}

function NeonArenaUnrevealedOverlay(props: UnrevealedDotArtworkProps) {
  const progressStrokeWidth = Math.max(4, props.size * 0.035);
  const progressPath = useMemo(
    () => makeCirclePath(props.size, props.size * 0.47),
    [props.size],
  );

  return (
    <Group
      origin={vec(props.size / 2, props.size / 2)}
      transform={[{ rotate: -Math.PI / 2 }]}
    >
      <Path
        path={progressPath}
        style="stroke"
        strokeWidth={progressStrokeWidth}
        color="rgba(255,44,203,0.22)"
      />
      <Path
        path={progressPath}
        style="stroke"
        strokeWidth={progressStrokeWidth * 2.2}
        strokeCap="round"
        color="rgba(255,255,255,0.64)"
        start={0}
        end={props.holdProgress}
      >
        <Blur blur={props.size * 0.045} mode="decal" />
      </Path>
      <Path
        path={progressPath}
        style="stroke"
        strokeWidth={progressStrokeWidth}
        strokeCap="round"
        color={WHITE}
        start={0}
        end={props.holdProgress}
      />
    </Group>
  );
}

function TeamNeonRings(props: {
  size: number;
  color: string | SharedValue<string>;
}) {
  const outerRadius = props.size * 0.43;
  const innerRadius = props.size * 0.35;
  const outerPath = useMemo(
    () => makeCirclePath(props.size, outerRadius),
    [outerRadius, props.size],
  );
  const innerPath = useMemo(
    () => makeCirclePath(props.size, innerRadius),
    [innerRadius, props.size],
  );
  const glowWidth = Math.max(7, props.size * 0.065);
  const coreWidth = Math.max(2, props.size * 0.018);

  return (
    <>
      <Circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={props.size * 0.47}
        color={REVEALED_DARK_CENTER}
      />
      <Path
        path={outerPath}
        style="stroke"
        strokeWidth={glowWidth}
        color={props.color}
        opacity={0.55}
      >
        <Blur blur={props.size * 0.055} mode="decal" />
      </Path>
      <Path
        path={outerPath}
        style="stroke"
        strokeWidth={coreWidth}
        color={props.color}
      />
      <Path
        path={innerPath}
        style="stroke"
        strokeWidth={glowWidth}
        color={props.color}
        opacity={0.55}
      >
        <Blur blur={props.size * 0.05} mode="decal" />
      </Path>
      <Path
        path={innerPath}
        style="stroke"
        strokeWidth={coreWidth}
        color={props.color}
      />
    </>
  );
}

function NeonArenaRevealedDot(props: RevealedDotArtworkProps) {
  const encoding = getNeonArenaTeamEncoding(props.team);

  return <TeamNeonRings size={props.size} color={encoding.color} />;
}

function NeonArenaSharedRevealedDot(props: SharedRevealedDotArtworkProps) {
  const color = useDerivedValue<string>(() => {
    const index = Math.min(
      NEON_ARENA_TEAM_ENCODINGS.length - 1,
      props.team.get() - 1,
    );
    return index >= 0
      ? NEON_ARENA_TEAM_ENCODINGS[index].color
      : "rgba(0,0,0,0)";
  });

  return <TeamNeonRings size={props.size} color={color} />;
}

export const neonArenaArtwork: GameThemeArtwork = {
  UnrevealedDot: NeonArenaUnrevealedDot,
  RasterizedUnrevealedBase: NeonRings,
  UnrevealedOverlay: NeonArenaUnrevealedOverlay,
  RevealedDot: NeonArenaRevealedDot,
  SharedRevealedDot: NeonArenaSharedRevealedDot,
};
