import { describe, expect, it, vi } from "vitest";
import { buildShapePath } from "./dot-shapes";

vi.mock("@shopify/react-native-skia", () => ({
  Skia: {
    Path: {
      Make: () => ({ points: [] }),
      Polygon: (points: Point[]) => ({ points }),
    },
  },
}));

type Point = { x: number; y: number };

function getMiterTipY(points: Point[], strokeWidth: number) {
  const vertex = points[0];
  const previous = points[points.length - 1];
  const next = points[1];
  const previousVector = {
    x: previous.x - vertex.x,
    y: previous.y - vertex.y,
  };
  const nextVector = {
    x: next.x - vertex.x,
    y: next.y - vertex.y,
  };
  const previousLength = Math.hypot(previousVector.x, previousVector.y);
  const nextLength = Math.hypot(nextVector.x, nextVector.y);
  const angle = Math.acos(
    (previousVector.x * nextVector.x + previousVector.y * nextVector.y) /
      (previousLength * nextLength),
  );
  const miterLength = strokeWidth / 2 / Math.sin(angle / 2);

  return vertex.y - miterLength;
}

describe("dot shapes", () => {
  it("keeps the spike outline inside its rasterized artwork", () => {
    const size = 150;
    const ringThickness = size * 0.08;
    const stickerStroke = ringThickness * 0.35;
    const outerStroke = ringThickness + stickerStroke;
    const path = buildShapePath(size, "spike", ringThickness) as unknown as {
      points: Point[];
    };

    expect(getMiterTipY(path.points, outerStroke)).toBeGreaterThanOrEqual(0);
  });
});
