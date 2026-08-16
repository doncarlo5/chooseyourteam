import {
  Blur,
  Canvas,
  Fill,
  Group,
  LinearGradient,
  Paint,
  Rect,
  Vertices,
  vec,
} from "@shopify/react-native-skia";
import { useIsFocused } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";

type Point = { x: number; y: number };
type RGB = readonly [number, number, number];
const DEFAULT_PALETTE = ["#00E2EE", "#69EF6C", "#FFB347"];

// ---------- Grid helpers ----------
const makeGrid = (
  width: number,
  height: number,
  cols: number,
  rows: number,
) => {
  const pts: Point[] = [];
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      pts.push({ x: (x * width) / cols, y: (y * height) / rows });
    }
  }
  return pts;
};

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

      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }
  return indices;
};

// ---------- Color helpers (JS thread) ----------
const hexToRgb01 = (hex: string): RGB => {
  const h = hex.replace("#", "").trim();
  const v = parseInt(h, 16);
  const r = ((v >> 16) & 255) / 255;
  const g = ((v >> 8) & 255) / 255;
  const b = (v & 255) / 255;
  return [r, g, b];
};

// ---------- Worklet-safe math + noise ----------
const clamp = (v: number, min: number, max: number) => {
  "worklet";
  return Math.max(min, Math.min(max, v));
};

const rgbaToString = (r: number, g: number, b: number, a: number) => {
  "worklet";
  const red = Math.round(clamp(r, 0, 1) * 255);
  const green = Math.round(clamp(g, 0, 1) * 255);
  const blue = Math.round(clamp(b, 0, 1) * 255);
  return `rgba(${red},${green},${blue},${clamp(a, 0, 1)})`;
};

const lerp = (a: number, b: number, t: number) => {
  "worklet";
  return a + (b - a) * t;
};

const smoothstep = (edge0: number, edge1: number, x: number) => {
  "worklet";
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const fract = (x: number) => {
  "worklet";
  return x - Math.floor(x);
};

// A tiny hash -> [0..1]
const hash2D = (x: number, y: number, seed: number) => {
  "worklet";
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123);
};

// Smooth value-noise -> [-1..1]
const noise2D = (x: number, y: number, seed: number) => {
  "worklet";
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const n00 = hash2D(xi, yi, seed);
  const n10 = hash2D(xi + 1, yi, seed);
  const n01 = hash2D(xi, yi + 1, seed);
  const n11 = hash2D(xi + 1, yi + 1, seed);

  const x1 = lerp(n00, n10, u);
  const x2 = lerp(n01, n11, u);
  const n = lerp(x1, x2, v); // 0..1

  return n * 2 - 1; // -1..1
};

const useIsAppActive = () => {
  const [isActive, setIsActive] = useState(AppState.currentState === "active");
  const handleAppStateChange = (nextState: string) => {
    setIsActive(nextState === "active");
  };

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  return isActive;
};

export default function MeshGradientBackground(props: {
  cols?: number;
  rows?: number;
  amplitude?: number;
  speed?: number;
  baseColor?: string;
  overlay?: string;
  palette?: string[];

  vertexAlpha?: number; // 0..1
  darkenTop?: boolean;
  blurSigma?: number;
  blurMode?: "clamp" | "repeat" | "mirror" | "decal";
  meshOverscan?: number;
  useBandFade?: boolean;
  bandFadeStrength?: number; // 0..1
  colorDarken?: number; // 0..1
  yellowWeight?: number; // 0..1
  isAnimationPaused?: boolean;
  testID?: string;
}) {
  const cols = props.cols ?? 6;
  const rows = props.rows ?? 10;
  const amplitude = props.amplitude ?? 18;
  const speed = props.speed ?? 0.00032;
  const baseColor = props.baseColor ?? "#E8FBFB";
  const overlay = props.overlay ?? "rgba(232,251,251,0.12)";
  const palette = props.palette ?? DEFAULT_PALETTE;
  const vertexAlpha = props.vertexAlpha ?? 0.9;
  const darkenTop = props.darkenTop ?? false;
  const blurSigma = props.blurSigma ?? 14;
  const blurMode = props.blurMode ?? "mirror";
  const meshOverscan = props.meshOverscan ?? Math.ceil(blurSigma * 2);
  const useBandFade = props.useBandFade ?? true;
  const bandFadeStrength = props.bandFadeStrength ?? 0.45;
  const colorDarken = props.colorDarken ?? 0.95;
  const yellowWeight = props.yellowWeight ?? 0.65;

  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const isAppActive = useIsAppActive();
  const clock = useSharedValue(0);
  const lastFrameTimestamp = useSharedValue(-1);
  const frameCallback = useFrameCallback((frame) => {
    "worklet";
    const previousTimestamp = lastFrameTimestamp.get();
    if (previousTimestamp >= 0) {
      clock.set(clock.get() + frame.timestamp - previousTimestamp);
    }
    lastFrameTimestamp.set(frame.timestamp);
  }, false);

  useEffect(() => {
    const shouldAnimate = isFocused && isAppActive && !props.isAnimationPaused;
    lastFrameTimestamp.set(-1);
    frameCallback.setActive(shouldAnimate);
    return () => frameCallback.setActive(false);
  }, [
    frameCallback,
    isAppActive,
    isFocused,
    lastFrameTimestamp,
    props.isAnimationPaused,
  ]);

  const safeOverscan = Math.max(0, meshOverscan);
  const meshWidth = Math.max(0, width + safeOverscan * 2);
  const meshHeight = Math.max(0, height + safeOverscan * 2);

  const baseVertices = useMemo(
    () =>
      makeGrid(meshWidth, meshHeight, cols, rows).map((p) => ({
        x: p.x - safeOverscan,
        y: p.y - safeOverscan,
      })),
    [meshWidth, meshHeight, cols, rows, safeOverscan],
  );

  const indices = useMemo(() => makeIndices(cols, rows), [cols, rows]);

  // Precompute palette as RGB floats (0..1) for worklet usage
  const paletteRgb = useMemo(() => palette.map(hexToRgb01), [palette]);

  // Blend a small palette on top of a base layer with noise.
  const layerOrder = useMemo(() => {
    if (paletteRgb.length >= 5) return [0, 1, 3, 4] as const;
    // fallback: everything except the middle index
    const baseIdx = Math.floor(paletteRgb.length / 2);
    return paletteRgb.map((_, i) => i).filter((i) => i !== baseIdx);
  }, [paletteRgb]);

  // Animate ONLY inner vertices (pin edges to avoid gaps).
  // Motion is coherent: depends on UV coords + time for a soft mesh drift.
  // Keep Point[]/string[] shared values here: those are the documented Vertices
  // inputs. Skia 2.11 buffer hooks did not produce a visible Vertices draw.
  const animatedVertices = useDerivedValue(() => {
    "worklet";
    const t = clock.get() * speed;
    const stride = cols + 1;

    return baseVertices.map((basePoint, i) => {
      const xi = i % stride;
      const yi = Math.floor(i / stride);
      const isEdge = xi === 0 || yi === 0 || xi === cols || yi === rows;
      if (isEdge) return basePoint;

      const u = xi / cols;
      const v = yi / rows;
      const uvx = u * 2 - 1;
      const uvy = v * 2 - 1;
      const edge = 0.14;
      const edgeFade =
        smoothstep(0, edge, u) *
        smoothstep(0, edge, 1 - u) *
        smoothstep(0, edge, v) *
        smoothstep(0, edge, 1 - v);
      const fx = 2.25;
      const fy = 3.15;
      const n1 = noise2D(uvx * fx + t * 0.35, uvy * fy + t * 0.18, 10.0);
      const n2 = noise2D(
        uvx * fx - t * 0.22 + 9.3,
        uvy * fy + t * 0.28 + 2.1,
        42.0,
      );

      return {
        x: basePoint.x + amplitude * 0.35 * n1 * edgeFade,
        y: basePoint.y + amplitude * n2 * edgeFade,
      };
    });
  });

  // Layered color blending:
  // baseColor acts as a calm backdrop; each layer uses smoothstep + pow falloff.
  const animatedColors = useDerivedValue(() => {
    "worklet";
    const t = clock.get() * speed;
    const stride = cols + 1;
    const baseIdx = Math.min(2, paletteRgb.length - 1);
    const base = paletteRgb[baseIdx] ?? ([0.44, 0.07, 0.95] as const);

    return baseVertices.map((_, i) => {
      const xi = i % stride;
      const yi = Math.floor(i / stride);
      const u = xi / cols;
      const v = yi / rows;
      const uvx = u * 2 - 1;
      const uvy = v * 2 - 1;
      const band = 1 - clamp(Math.abs(uvy), 0, 1);
      const bandFade = useBandFade
        ? lerp(1, band * band, clamp(bandFadeStrength, 0, 1))
        : 1;
      let r = base[0];
      let g = base[1];
      let b = base[2];

      for (let k = 0; k < layerOrder.length; k += 1) {
        const idx = layerOrder[k];
        const paletteColor = paletteRgb[idx] ?? base;
        const freqX = 1.6 + k * 0.55;
        const freqY = 2.2 + k * 0.45;
        const flowX = 0.2 + k * 0.07;
        const flowY = 0.12 + k * 0.05;
        const seed = 100 + k * 37.7;
        const raw = noise2D(
          uvx * freqX + t * flowX + seed,
          uvy * freqY - t * flowY + seed * 0.33,
          seed,
        );
        const noise = raw * 0.5 + 0.5;
        const weight = smoothstep(0.22, 0.66 + 0.06 * k, noise);
        const layerWeight = idx === 3 ? clamp(yellowWeight, 0, 1) : 1;
        const opacity = Math.pow(weight, 4) * bandFade * layerWeight;
        r = lerp(r, paletteColor[0], opacity);
        g = lerp(g, paletteColor[1], opacity);
        b = lerp(b, paletteColor[2], opacity);
      }

      const darken = clamp(colorDarken, 0, 1);
      return rgbaToString(r * darken, g * darken, b * darken, vertexAlpha);
    });
  });

  return (
    <View
      testID={props.testID}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Base fill prevents any accidental gaps from showing through */}
        <Fill color={baseColor} />

        <Group
          layer={
            <Paint>
              <Blur blur={blurSigma} mode={blurMode} />
            </Paint>
          }
        >
          <Vertices
            vertices={animatedVertices}
            indices={indices}
            colors={animatedColors}
          />
        </Group>

        {/* Subtle top fade using a linear gradient shader. */}
        {darkenTop ? (
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, height)}
              colors={["rgba(0,0,0,0.22)", "rgba(0,0,0,0)"]}
              positions={[0, 0.55]}
            />
          </Rect>
        ) : null}

        {/* Optional haze to keep your original “light UI” vibe */}
        <Fill color={overlay} />
      </Canvas>
    </View>
  );
}
