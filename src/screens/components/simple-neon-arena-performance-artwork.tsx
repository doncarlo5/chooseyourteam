import {
  DESERT_LAGOON_TEAM_ENCODINGS,
  getDesertLagoonTeamEncoding,
} from "@/src/game-themes/desert-lagoon-team-encoding";
import type {
  GameThemeArtwork,
  RevealedDotArtworkProps,
  SharedRevealedDotArtworkProps,
  UnrevealedDotArtworkProps,
} from "@/src/game-themes/game-theme-types";
import { buildShapePath } from "@/src/screens/utils/dot-shapes";
import { Circle, Group, Path, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { useDerivedValue } from "react-native-reanimated";

const RED = "#EF233C";
const WHITE = "#FFFFFF";

function SimpleUnrevealedDot(props: UnrevealedDotArtworkProps) {
  const progressStrokeWidth = Math.max(4, props.size * 0.045);
  const progressPath = useMemo(
    () =>
      Skia.Path.Circle(
        props.size / 2,
        props.size / 2,
        props.size / 2 - progressStrokeWidth / 2,
      ),
    [progressStrokeWidth, props.size],
  );

  return (
    <>
      <Circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={props.size / 2}
        color={RED}
      />
      <Path
        path={progressPath}
        style="stroke"
        strokeWidth={progressStrokeWidth}
        strokeCap="round"
        color={WHITE}
        start={0}
        end={props.holdProgress}
      />
    </>
  );
}

function SimpleRevealedDot(props: RevealedDotArtworkProps) {
  const shapeStrokeWidth = Math.max(3, props.size * 0.035);
  const shapeInset = props.size * 0.22;
  const encoding = getDesertLagoonTeamEncoding(props.team);
  const shapePath = useMemo(
    () =>
      buildShapePath(
        props.size - shapeInset * 2,
        encoding.shape,
        shapeStrokeWidth,
      ),
    [encoding.shape, props.size, shapeInset, shapeStrokeWidth],
  );

  return (
    <>
      <Circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={props.size / 2}
        color={RED}
      />
      <Group
        transform={[{ translateX: shapeInset }, { translateY: shapeInset }]}
      >
        <Path
          path={shapePath}
          style="stroke"
          strokeWidth={shapeStrokeWidth}
          color={WHITE}
        />
      </Group>
    </>
  );
}

function SimpleSharedRevealedDot(props: SharedRevealedDotArtworkProps) {
  const shapeStrokeWidth = Math.max(3, props.size * 0.035);
  const shapeInset = props.size * 0.22;
  const paths = useMemo(
    () =>
      DESERT_LAGOON_TEAM_ENCODINGS.map((encoding) =>
        buildShapePath(
          props.size - shapeInset * 2,
          encoding.shape,
          shapeStrokeWidth,
        ),
      ),
    [props.size, shapeInset, shapeStrokeWidth],
  );
  const emptyPath = useMemo(() => Skia.Path.Make(), []);
  const shapePath = useDerivedValue(() => {
    const index = Math.min(paths.length - 1, props.team.get() - 1);
    return index >= 0 ? paths[index] : emptyPath;
  });

  return (
    <>
      <Circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={props.size / 2}
        color={RED}
      />
      <Group
        transform={[{ translateX: shapeInset }, { translateY: shapeInset }]}
      >
        <Path
          path={shapePath}
          style="stroke"
          strokeWidth={shapeStrokeWidth}
          color={WHITE}
        />
      </Group>
    </>
  );
}

export const simpleNeonArenaPerformanceArtwork: GameThemeArtwork = {
  UnrevealedDot: SimpleUnrevealedDot,
  RevealedDot: SimpleRevealedDot,
  SharedRevealedDot: SimpleSharedRevealedDot,
};
