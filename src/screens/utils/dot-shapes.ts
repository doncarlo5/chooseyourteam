import type { TeamShape } from "@/src/game-themes/team-encoding";
import { Skia } from "@shopify/react-native-skia";

type Point = { x: number; y: number };

const closePath = (points: Point[]) => {
  if (points.length === 0) {
    return Skia.Path.Make();
  }

  return Skia.Path.Polygon(points, true);
};

const buildPolygon = (
  sides: number,
  cx: number,
  cy: number,
  radius: number,
) => {
  const points: Point[] = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / sides;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }
  return closePath(points);
};

export const buildShapePath = (
  size: number,
  shape: TeamShape,
  strokeWidth: number,
) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.max(1, size / 2 - strokeWidth);

  if (shape === "hexagon") {
    return buildPolygon(6, cx, cy, radius);
  }

  if (shape === "diamond") {
    return closePath([
      { x: cx, y: cy - radius },
      { x: cx + radius, y: cy },
      { x: cx, y: cy + radius },
      { x: cx - radius, y: cy },
    ]);
  }

  if (shape === "spike") {
    const points: Point[] = [];
    const spikes = 12;
    const inner = radius * 0.7;
    const total = spikes * 2;
    for (let i = 0; i < total; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / total;
      const r = i % 2 === 0 ? radius : inner;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return closePath(points);
  }

  if (shape === "wave") {
    const points: Point[] = [];
    const segments = 96;
    const amplitude = radius * 0.08;
    const frequency = 6;
    for (let i = 0; i <= segments; i += 1) {
      const angle = (Math.PI * 2 * i) / segments;
      const wave = Math.sin(angle * frequency);
      const r = radius + amplitude * wave;
      points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return closePath(points);
  }

  if (shape === "squircle") {
    const points: Point[] = [];
    const segments = 72;
    const n = 4;
    for (let i = 0; i <= segments; i += 1) {
      const angle = (Math.PI * 2 * i) / segments;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = Math.sign(cos) * Math.pow(Math.abs(cos), 2 / n) * radius + cx;
      const y = Math.sign(sin) * Math.pow(Math.abs(sin), 2 / n) * radius + cy;
      points.push({ x, y });
    }
    return closePath(points);
  }

  return Skia.Path.Make();
};
