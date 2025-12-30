import { Canvas, Fill, Vertices, useClock } from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useDerivedValue } from "react-native-reanimated";

type Point = { x: number; y: number };

const makeGrid = (
  width: number,
  height: number,
  cols: number,
  rows: number
) => {
  const pts: Point[] = [];
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      pts.push({ x: (x * width) / cols, y: (y * height) / rows });
    }
  }
  return pts;
};

// Build indices for a regular grid (2 triangles per cell).
const makeIndices = (cols: number, rows: number) => {
  const indices: number[] = [];
  const stride = cols + 1;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * stride + x;
      const a = i;
      const b = i + 1;
      const c = i + stride;
      const d = i + stride + 1;

      // triangle 1: a-b-d
      indices.push(a, b, d);
      // triangle 2: a-d-c
      indices.push(a, d, c);
    }
  }
  return indices;
};

// Small deterministic “smooth noise” (worklet-safe).
const smoothNoise = (t: number, seed: number) => {
  "worklet";
  return (
    Math.sin(t + seed) * 0.6 +
    Math.sin(t * 0.73 + seed * 1.91) * 0.3 +
    Math.sin(t * 1.37 + seed * 0.53) * 0.1
  ); // approx [-1..1]
};

export default function MeshGradientBackground({
  cols = 6,
  rows = 10,
  amplitude = 24,
  speed = 0.00045,
  baseColor = "#E4E4E4",
  overlay = "rgba(228,228,228,0.08)",
  palette = ["#FF4D6D", "#5F6FFF", "#3AD29F", "#FFD166", "#8B5CF6", "#00D4FF"],
}: {
  cols?: number;
  rows?: number;
  amplitude?: number;
  speed?: number;
  baseColor?: string;
  overlay?: string;
  palette?: string[];
}) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();

  const baseVertices = useMemo(
    () => makeGrid(width, height, cols, rows),
    [width, height, cols, rows]
  );

  const indices = useMemo(() => makeIndices(cols, rows), [cols, rows]);

  // One color per vertex (Skia interpolates across triangles)
  const colors = useMemo(
    () => baseVertices.map((_, i) => palette[i % palette.length]),
    [baseVertices, palette]
  );

  // Animate ONLY inner vertices (pin edges to avoid “white gaps” tearing at screen bounds).
  const animatedVertices = useDerivedValue(() => {
    "worklet";
    const t = clock.value * speed;
    const stride = cols + 1;

    return baseVertices.map((p, i) => {
      const xi = i % stride;
      const yi = Math.floor(i / stride);
      const isEdge = xi === 0 || yi === 0 || xi === cols || yi === rows;
      if (isEdge) return p;

      const dx = amplitude * smoothNoise(t, i * 12.9898);
      const dy = amplitude * smoothNoise(t * 1.13, i * 78.233);

      return { x: p.x + dx, y: p.y + dy };
    });
  }, [baseVertices, cols, rows, amplitude, speed]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* A base fill prevents any accidental gaps from showing through */}
        <Fill color={baseColor} />
        <Vertices
          vertices={animatedVertices}
          indices={indices}
          colors={colors}
        />
        {/* Optional haze to keep your original “#E4E4E4” UI vibe */}
        <Fill color={overlay} />
      </Canvas>
    </View>
  );
}
