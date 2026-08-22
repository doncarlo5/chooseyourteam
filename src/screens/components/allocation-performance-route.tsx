import { AppText } from "@/src/components/app-text";
import type { RevealedPlayer } from "@/src/domain/revealed-player";
import { neonArenaArtwork } from "@/src/game-themes/neon-arena-artwork";
import { neonArenaTheme } from "@/src/game-themes/neon-arena-theme";
import {
  AllocationSceneCanvas,
  type AllocationLiveSlot,
  RevealedPlayerLabelLayer,
} from "@/src/screens/components/touch-allocation-scene-content";
import * as Device from "expo-device";
import { File, Paths } from "expo-file-system";
import { Redirect, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import {
  cancelAnimation,
  Easing,
  makeMutable,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { simpleNeonArenaPerformanceArtwork } from "./simple-neon-arena-performance-artwork";

type PerformanceVariant = "simple" | "neon";
type PerformanceScenario = "live-12" | "frozen-5-live-2";

type PerformanceReport = {
  variant: PerformanceVariant;
  scenario: PerformanceScenario;
  run: number;
  model: string;
  os: string;
  refreshRateEstimate: number;
  sampleCount: number;
  medianFrameTimeMs: number;
  p95FrameTimeMs: number;
};

const WARMUP_DURATION_MS = 3_000;
const SAMPLE_DURATION_MS = 15_000;

function isVariant(value?: string): value is PerformanceVariant {
  return value === "simple" || value === "neon";
}

function isScenario(value?: string): value is PerformanceScenario {
  return value === "live-12" || value === "frozen-5-live-2";
}

function percentile(sortedValues: number[], fraction: number) {
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * fraction) - 1),
  );
  return sortedValues[index] ?? 0;
}

function getDeviceModel() {
  if (Device.modelName) {
    return Device.modelName;
  }
  if (Platform.OS === "android") {
    return Platform.constants.Model;
  }
  if (Platform.OS === "ios") {
    return Platform.constants.interfaceIdiom;
  }
  return Platform.OS;
}

function writePerformanceReport(report: PerformanceReport) {
  try {
    const file = new File(
      Paths.document,
      `allocation-performance-${report.variant}-${report.scenario}-${report.run}.json`,
    );
    if (!file.exists) {
      file.create();
    }
    file.write(JSON.stringify(report));
  } catch (error) {
    console.error("Failed to persist allocation performance report", error);
  }
}

function FrameProfiler(props: {
  variant: PerformanceVariant;
  scenario: PerformanceScenario;
  run: number;
}) {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const elapsed = useSharedValue(0);
  const isComplete = useSharedValue(false);
  const samples = useSharedValue<number[]>([]);

  const handleSamples = useCallback(
    (frameTimes: number[]) => {
      const sorted = [...frameTimes].sort((a, b) => a - b);
      const medianFrameTimeMs = percentile(sorted, 0.5);
      const nextReport: PerformanceReport = {
        variant: props.variant,
        scenario: props.scenario,
        run: props.run,
        model: getDeviceModel(),
        os: `${Device.osName ?? Platform.OS} ${Device.osVersion ?? Platform.Version}`,
        refreshRateEstimate:
          medianFrameTimeMs > 0 ? Math.round(1_000 / medianFrameTimeMs) : 0,
        sampleCount: sorted.length,
        medianFrameTimeMs,
        p95FrameTimeMs: percentile(sorted, 0.95),
      };
      setReport(nextReport);
      writePerformanceReport(nextReport);
      console.info(`[AllocationPerformance] ${JSON.stringify(nextReport)}`);
    },
    [props.run, props.scenario, props.variant],
  );

  useFrameCallback((frame) => {
    "worklet";
    const delta = frame.timeSincePreviousFrame;
    if (delta === null || isComplete.get()) {
      return;
    }
    const nextElapsed = elapsed.get() + delta;
    elapsed.set(nextElapsed);
    if (nextElapsed <= WARMUP_DURATION_MS) {
      return;
    }
    if (nextElapsed <= WARMUP_DURATION_MS + SAMPLE_DURATION_MS) {
      samples.modify((values) => {
        values.push(delta);
        return values;
      }, true);
      return;
    }
    isComplete.set(true);
    scheduleOnRN(handleSamples, samples.get());
  });

  return (
    <View pointerEvents="none" style={styles.profiler}>
      <AppText className={cn("text-center text-xs text-white/70")}>
        {report
          ? JSON.stringify(report)
          : `Profiling ${props.variant} · ${props.scenario} · run ${props.run}`}
      </AppText>
    </View>
  );
}

function makeLivePositions(width: number, height: number) {
  const columns = [0.2, 0.5, 0.8];
  const rows = [0.25, 0.45, 0.65, 0.84];
  return rows.flatMap((row) =>
    columns.map((column) => ({ x: width * column, y: height * row })),
  );
}

function PerformanceScene(props: {
  variant: PerformanceVariant;
  scenario: PerformanceScenario;
  run: number;
}) {
  const { width, height } = useWindowDimensions();
  const positions = useMemo(
    () => makeLivePositions(width, height),
    [height, width],
  );
  const liveCount = props.scenario === "live-12" ? 12 : 2;
  const slots = useMemo<AllocationLiveSlot[]>(
    () =>
      positions.map((position, index) => ({
        active: makeMutable(index < liveCount ? 1 : 0),
        x: makeMutable(position.x),
        y: makeMutable(position.y),
        opacity: makeMutable(1),
        scale: makeMutable(1),
        team: makeMutable(0),
        revealProgress: makeMutable(0),
      })),
    [liveCount, positions],
  );
  const frozenPlayers = useMemo<RevealedPlayer[]>(
    () =>
      props.scenario === "frozen-5-live-2"
        ? [
            { x: width * 0.2, y: height * 0.3, team: 1 },
            { x: width * 0.5, y: height * 0.3, team: 2 },
            { x: width * 0.8, y: height * 0.3, team: 3 },
            { x: width * 0.34, y: height * 0.55, team: 4 },
            { x: width * 0.66, y: height * 0.55, team: 5 },
          ]
        : [],
    [height, props.scenario, width],
  );
  const buffers = useMemo(
    () => ({
      roundOneTransform: makeMutable([{ translateX: 0 }]),
      roundTwoTransform: makeMutable([{ translateX: 0 }]),
      roundOneOpacity: makeMutable(1),
      roundTwoOpacity: makeMutable(0),
      liveSceneOpacity: makeMutable(1),
      shakeX: makeMutable(0),
      holdProgress: makeMutable(0),
    }),
    [],
  );

  function startPerformanceAnimationsEffect() {
    buffers.holdProgress.set(
      withRepeat(
        withTiming(1, { duration: 3_000, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    if (props.scenario === "frozen-5-live-2") {
      buffers.roundOneOpacity.set(
        withRepeat(
          withTiming(0.55, {
            duration: 1_500,
            easing: Easing.inOut(Easing.quad),
          }),
          -1,
          true,
        ),
      );
    }
    return () => {
      cancelAnimation(buffers.holdProgress);
      cancelAnimation(buffers.roundOneOpacity);
    };
  }

  useEffect(startPerformanceAnimationsEffect, [buffers, props.scenario]);

  const artwork =
    props.variant === "neon"
      ? neonArenaArtwork
      : simpleNeonArenaPerformanceArtwork;

  return (
    <View testID="allocation-performance-fixture" style={styles.container}>
      {props.variant === "neon" ? (
        <neonArenaTheme.Background />
      ) : (
        <View style={styles.simpleBackground} />
      )}
      <AllocationSceneCanvas
        slots={slots}
        frozenRounds={{ roundOne: frozenPlayers, roundTwo: [] }}
        roundOneTransform={buffers.roundOneTransform}
        roundTwoTransform={buffers.roundTwoTransform}
        roundOneOpacity={buffers.roundOneOpacity}
        roundTwoOpacity={buffers.roundTwoOpacity}
        liveSceneOpacity={buffers.liveSceneOpacity}
        shakeX={buffers.shakeX}
        holdProgress={buffers.holdProgress}
        artwork={artwork}
        themeId="neon-arena"
      />
      <RevealedPlayerLabelLayer
        players={frozenPlayers}
        transform={buffers.roundOneTransform}
        opacity={buffers.roundOneOpacity}
        isAccessibilityVisible
      />
      <FrameProfiler
        variant={props.variant}
        scenario={props.scenario}
        run={props.run}
      />
    </View>
  );
}

export default function AllocationPerformanceRoute() {
  const params = useLocalSearchParams<{
    variant?: string;
    scenario?: string;
    run?: string;
  }>();
  const isFixtureEnabled =
    process.env.EXPO_PUBLIC_ENABLE_NATIVE_PERF_FIXTURES === "true";
  const variant = isVariant(params.variant) ? params.variant : "simple";
  const scenario = isScenario(params.scenario) ? params.scenario : "live-12";
  const run = Math.max(1, Number.parseInt(params.run ?? "1", 10) || 1);

  if (!isFixtureEnabled) {
    return <Redirect href="/" />;
  }

  return <PerformanceScene variant={variant} scenario={scenario} run={run} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  simpleBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
  },
  profiler: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
});
