import { Circle, Group, Path, Skia, vec } from "@shopify/react-native-skia";
import { useMemo } from "react";
import type {
  GameThemeArtwork,
  UnrevealedDotArtworkProps,
} from "./game-theme-types";
import { CORAL_SKY_TEAM_ENCODINGS } from "./coral-sky-team-encoding";
import { createShapedResultArtwork } from "./shaped-result-artwork";

function CoralSkyUnrevealedDot(props: UnrevealedDotArtworkProps) {
  const progressPath = useMemo(
    () => Skia.Path.Circle(props.size / 2, props.size / 2, props.size * 0.455),
    [props.size],
  );
  return (
    <>
      <Circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={props.size * 0.37}
        color="#FF6A21"
      />
      <Circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={props.size * 0.37}
        color="white"
        style="stroke"
        strokeWidth={props.size * 0.055}
      />
      <Circle
        cx={props.size * 0.38}
        cy={props.size * 0.29}
        r={props.size * 0.055}
        color="rgba(255,255,255,0.8)"
      />
      <Group
        origin={vec(props.size / 2, props.size / 2)}
        transform={[{ rotate: -Math.PI / 2 }]}
      >
        <Path
          path={progressPath}
          color="rgba(57,37,27,0.5)"
          style="stroke"
          strokeWidth={props.size * 0.05}
        />
        <Path
          path={progressPath}
          color="white"
          style="stroke"
          strokeWidth={props.size * 0.05}
          strokeCap="round"
          start={0}
          end={props.holdProgress}
        />
      </Group>
    </>
  );
}

export const coralSkyArtwork: GameThemeArtwork = {
  UnrevealedDot: CoralSkyUnrevealedDot,
  ...createShapedResultArtwork(CORAL_SKY_TEAM_ENCODINGS, "sticker"),
};
