import { buildShapePath } from "../screens/utils/dot-shapes";
import {
  Circle,
  Group,
  LinearGradient,
  Path,
  Skia,
  vec,
  type SkPath,
} from "@shopify/react-native-skia";
import { useMemo } from "react";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import type {
  RevealedDotArtworkProps,
  SharedRevealedDotArtworkProps,
} from "./game-theme-types";
import type { TeamShape, ShapedTeamEncoding } from "./team-encoding";

// The star's deep notches need a larger outline to balance the fuller shapes.
// Scale only its geometry so numbers and stroke widths stay consistent.
function buildRevealedShapePath(size: number, shape: TeamShape) {
  const shapeSize = shape === "spike" ? size * 1.15 : size;
  const inset = (size - shapeSize) / 2;
  return buildShapePath(shapeSize, shape, shapeSize * 0.09).offset(
    inset,
    inset,
  );
}

function ShapedResultLayers(props: {
  size: number;
  path: SkPath | SharedValue<SkPath>;
  color: string | SharedValue<string>;
  material: "satin" | "sticker";
}) {
  if (props.material === "satin") {
    return (
      <>
        <Path
          path={props.path}
          color="rgba(255,255,255,0.8)"
          style="stroke"
          strokeWidth={props.size * 0.025}
          strokeJoin="round"
        />
        <Path path={props.path} color={props.color} />
        <Path path={props.path}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(props.size, props.size)}
            colors={[
              "rgba(255,255,255,0.35)",
              "rgba(255,255,255,0)",
              "rgba(0,0,0,0.12)",
            ]}
          />
        </Path>
      </>
    );
  }

  return (
    <>
      <Group
        transform={[
          { translateX: props.size * 0.018 },
          { translateY: props.size * 0.035 },
        ]}
      >
        <Path path={props.path} color="#39251B" />
        <Path
          path={props.path}
          color="#39251B"
          style="stroke"
          strokeWidth={props.size * 0.045}
          strokeJoin="round"
        />
      </Group>
      <Path
        path={props.path}
        color="white"
        style="stroke"
        strokeWidth={props.size * 0.065}
        strokeJoin="round"
      />
      <Path path={props.path} color={props.color} />
      <Group clip={props.path}>
        <Circle
          cx={props.size * 0.34}
          cy={props.size * 0.25}
          r={props.size * 0.065}
          color="rgba(255,255,255,0.65)"
        />
      </Group>
    </>
  );
}

// Both render paths share geometry and layers, including offscreen native images.
export function createShapedResultArtwork(
  encodings: readonly ShapedTeamEncoding[],
  material: "satin" | "sticker",
) {
  function RevealedDot(props: RevealedDotArtworkProps) {
    const encoding = encodings[props.team - 1];
    const path = useMemo(
      () => buildRevealedShapePath(props.size, encoding.shape),
      [props.size, encoding.shape],
    );
    return (
      <ShapedResultLayers
        size={props.size}
        path={path}
        color={encoding.color}
        material={material}
      />
    );
  }

  function SharedRevealedDot(props: SharedRevealedDotArtworkProps) {
    const paths = useMemo(
      () =>
        encodings.map((encoding) =>
          buildRevealedShapePath(props.size, encoding.shape),
        ),
      [props.size],
    );
    const emptyPath = useMemo(() => Skia.Path.Make(), []);
    const path = useDerivedValue(
      () => paths[props.team.get() - 1] ?? emptyPath,
    );
    const color = useDerivedValue(
      () => encodings[props.team.get() - 1]?.color ?? "transparent",
    );
    return (
      <ShapedResultLayers
        size={props.size}
        path={path}
        color={color}
        material={material}
      />
    );
  }

  return { RevealedDot, SharedRevealedDot };
}
