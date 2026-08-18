import type { RevealedPlayer } from "@/src/domain/revealed-player";
import type { RoundAssignment, TeamNumber } from "@/src/domain/team-identity";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import {
  Canvas,
  Circle,
  drawAsImage,
  Group,
  Image,
  Path,
  Skia,
  SweepGradient,
  type SkImage,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "heroui-native";
import { Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import {
  SharedTeamResultArtwork,
  TeamResultArtwork,
} from "./team-result-artwork";
import RevealedPlayerLabel from "./revealed-player-label";
import useTouchAllocationController from "./use-touch-allocation-controller";

const BASE_CIRCLE_SIZE = 120;
const REVEAL_CIRCLE_SIZE = 150;
const GLASS_RING = "rgba(255,255,255,0.8)";
const TEAM_NUMBERS = [1, 2, 3, 4, 5] as const;

async function renderTeamResultImages(size: number) {
  return Promise.all(
    TEAM_NUMBERS.map((team) =>
      drawAsImage(<TeamResultArtwork size={size} team={team} />, {
        width: size,
        height: size,
      }),
    ),
  );
}

function disposeTeamResultImages(images: (SkImage | null)[]) {
  for (const image of images) {
    image?.dispose();
  }
}

function loadTeamResultImages(
  isEnabled: boolean,
  size: number,
  setImages: (images: (SkImage | null)[]) => void,
) {
  if (!isEnabled) {
    return () => undefined;
  }
  let isCancelled = false;
  void renderTeamResultImages(size).then((images) => {
    if (isCancelled) {
      disposeTeamResultImages(images);
      return;
    }
    setImages(images);
  });
  return () => {
    isCancelled = true;
  };
}

function useTeamResultImages(size: number, isEnabled: boolean) {
  const [images, setImages] = useState<(SkImage | null)[]>([]);

  function loadImagesEffect() {
    return loadTeamResultImages(isEnabled, size, setImages);
  }

  function disposeImagesEffect() {
    return () => disposeTeamResultImages(images);
  }

  useEffect(loadImagesEffect, [isEnabled, size]);
  useEffect(disposeImagesEffect, [images]);
  return images;
}

export type TouchAllocationConfiguration = {
  selectedTeams: number;
  round: 0 | 1;
  expectedTouchCount: number;
  allowOverExpected: boolean;
  roundAssignment?: RoundAssignment;
  isPairingModeEnabled: boolean;
  acceptsNewTouches: boolean;
  resetKey: number;
};

export type TouchAllocationSceneProps = {
  configuration: TouchAllocationConfiguration;
  excludedRects: SharedValue<TouchRect>[];
  frozenRounds: {
    roundOne: RevealedPlayer[];
    roundTwo: RevealedPlayer[];
  };
  roundScrollX: SharedValue<number>;
  isRoundNavigationIdle: SharedValue<boolean>;
  isMultiRound: boolean;
  onReveal: (event: { round: 0 | 1; players: RevealedPlayer[] }) => void;
  onTouchStateChange: (state: { count: number; isTouching: boolean }) => void;
  exitRequested: boolean;
  onExitReady: () => void;
  children: ReactNode;
};

function LiveDotArtwork(props: {
  active: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  shakeX: SharedValue<number>;
  holdProgress: SharedValue<number>;
  sceneOpacity: SharedValue<number>;
  shimmerClock: SharedValue<number>;
  team: SharedValue<number>;
  revealProgress: SharedValue<number>;
  showRevealedArtwork: boolean;
}) {
  const ringThickness = BASE_CIRCLE_SIZE * 0.08;
  const ringRadius = BASE_CIRCLE_SIZE / 2 - ringThickness / 2;
  const progressPath = useMemo(
    () =>
      Skia.Path.Circle(
        BASE_CIRCLE_SIZE / 2,
        BASE_CIRCLE_SIZE / 2,
        BASE_CIRCLE_SIZE / 2 - ringThickness,
      ),
    [ringThickness],
  );
  const unrevealedTransform = useDerivedValue(() => {
    const shake = props.shakeX.get();
    return [
      { translateX: props.x.get() - BASE_CIRCLE_SIZE / 2 + shake },
      { translateY: props.y.get() - BASE_CIRCLE_SIZE / 2 + shake * 0.12 },
      { rotate: (shake / BASE_CIRCLE_SIZE) * 0.55 },
      { scale: props.scale.get() },
    ];
  });
  const revealedTransform = useDerivedValue(() => [
    { translateX: props.x.get() - REVEAL_CIRCLE_SIZE / 2 },
    { translateY: props.y.get() - REVEAL_CIRCLE_SIZE / 2 },
    {
      scale:
        props.scale.get() *
        interpolate(props.revealProgress.get(), [0, 1], [0.8, 1]),
    },
  ]);
  const sharedOpacity = useDerivedValue(
    () => props.active.get() * props.opacity.get() * props.sceneOpacity.get(),
  );
  const unrevealedOpacity = useDerivedValue(
    () => sharedOpacity.get() * (1 - props.revealProgress.get()),
  );
  const revealedOpacity = useDerivedValue(
    () => sharedOpacity.get() * props.revealProgress.get(),
  );
  const shimmerTransform = useDerivedValue(() => [
    { rotate: (props.shimmerClock.get() / 1200) * Math.PI * 3 },
  ]);

  return (
    <>
      <Group
        origin={vec(BASE_CIRCLE_SIZE / 2, BASE_CIRCLE_SIZE / 2)}
        transform={unrevealedTransform}
        opacity={unrevealedOpacity}
      >
        <Circle
          cx={BASE_CIRCLE_SIZE / 2}
          cy={BASE_CIRCLE_SIZE / 2}
          r={ringRadius}
          style="stroke"
          strokeWidth={ringThickness}
          color={GLASS_RING}
        />
        <Group
          origin={vec(BASE_CIRCLE_SIZE / 2, BASE_CIRCLE_SIZE / 2)}
          transform={shimmerTransform}
          opacity={0.9}
        >
          <Circle
            cx={BASE_CIRCLE_SIZE / 2}
            cy={BASE_CIRCLE_SIZE / 2}
            r={ringRadius - ringThickness * 0.45}
            style="stroke"
            strokeWidth={ringThickness * 0.99}
          >
            <SweepGradient
              c={vec(BASE_CIRCLE_SIZE / 2, BASE_CIRCLE_SIZE / 2)}
              colors={[
                "rgba(255,255,255,0)",
                "rgba(255,255,255,0.85)",
                "rgba(255,255,255,0)",
              ]}
            />
          </Circle>
        </Group>
        <Path
          path={progressPath}
          style="stroke"
          strokeWidth={ringThickness}
          strokeCap="round"
          color="rgba(255,255,255,0.95)"
          start={0}
          end={props.holdProgress}
        />
      </Group>
      {props.showRevealedArtwork ? (
        <Group
          origin={vec(REVEAL_CIRCLE_SIZE / 2, REVEAL_CIRCLE_SIZE / 2)}
          transform={revealedTransform}
          opacity={revealedOpacity}
        >
          <SharedTeamResultArtwork
            size={REVEAL_CIRCLE_SIZE}
            team={props.team}
          />
        </Group>
      ) : null}
    </>
  );
}

function FrozenRoundArtwork(props: {
  players: RevealedPlayer[];
  transform: SharedValue<{ translateX: number }[]>;
  opacity: SharedValue<number>;
  teamImages: (SkImage | null)[];
}) {
  return (
    <Group transform={props.transform} opacity={props.opacity}>
      {props.players.map((player, index) => (
        <Group
          key={`${player.x}-${player.y}-${player.team}-${index}`}
          transform={[
            { translateX: player.x - REVEAL_CIRCLE_SIZE / 2 },
            { translateY: player.y - REVEAL_CIRCLE_SIZE / 2 },
          ]}
        >
          {Platform.OS === "android" ? (
            <Image
              image={props.teamImages[player.team - 1] ?? null}
              x={0}
              y={0}
              width={REVEAL_CIRCLE_SIZE}
              height={REVEAL_CIRCLE_SIZE}
            />
          ) : (
            <TeamResultArtwork size={REVEAL_CIRCLE_SIZE} team={player.team} />
          )}
        </Group>
      ))}
    </Group>
  );
}

function LiveTeamLabel(props: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  active: SharedValue<number>;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  sceneOpacity: SharedValue<number>;
  team: TeamNumber;
}) {
  const style = useAnimatedStyle(() => ({
    opacity:
      props.active.get() * props.opacity.get() * props.sceneOpacity.get(),
    transform: [
      { translateX: props.x.get() - REVEAL_CIRCLE_SIZE / 2 },
      { translateY: props.y.get() - REVEAL_CIRCLE_SIZE / 2 },
      { scale: props.scale.get() },
    ],
  }));

  return (
    <RevealedPlayerLabel
      team={props.team}
      style={[styles.teamLabel, style]}
      isAnimated
    />
  );
}

export function RevealedPlayerLabelLayer(props: {
  players: RevealedPlayer[];
  transform: SharedValue<{ translateX: number }[]>;
  opacity: SharedValue<number>;
  isAccessibilityVisible: boolean;
  testID?: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: props.opacity.get(),
    transform: props.transform.get(),
  }));
  return (
    <Animated.View
      testID={props.testID}
      pointerEvents="none"
      aria-hidden={!props.isAccessibilityVisible}
      accessibilityElementsHidden={!props.isAccessibilityVisible}
      importantForAccessibility={
        props.isAccessibilityVisible ? "auto" : "no-hide-descendants"
      }
      style={[StyleSheet.absoluteFill, style]}
    >
      {props.players.map((player, index) => (
        <RevealedPlayerLabel
          key={`${player.x}-${player.y}-${player.team}-${index}`}
          team={player.team}
          isAccessibilityVisible={props.isAccessibilityVisible}
          style={[
            styles.teamLabel,
            {
              transform: [
                { translateX: player.x - REVEAL_CIRCLE_SIZE / 2 },
                { translateY: player.y - REVEAL_CIRCLE_SIZE / 2 },
              ],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

export type AllocationLiveSlot = {
  active: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  team: SharedValue<number>;
  revealProgress: SharedValue<number>;
};

export function AllocationSceneCanvas(props: {
  slots: AllocationLiveSlot[];
  frozenRounds: {
    roundOne: RevealedPlayer[];
    roundTwo: RevealedPlayer[];
  };
  roundOneTransform: SharedValue<{ translateX: number }[]>;
  roundTwoTransform: SharedValue<{ translateX: number }[]>;
  roundOneOpacity: SharedValue<number>;
  roundTwoOpacity: SharedValue<number>;
  liveSceneOpacity: SharedValue<number>;
  shakeX: SharedValue<number>;
  holdProgress: SharedValue<number>;
  shimmerClock?: SharedValue<number>;
  revealedSlotIndexes?: number[];
}) {
  const liveShimmerClock = useClock();
  const teamResultImages = useTeamResultImages(
    REVEAL_CIRCLE_SIZE,
    Platform.OS === "android",
  );
  const shimmerClock = props.shimmerClock ?? liveShimmerClock;
  const revealedSlotIndexes = props.revealedSlotIndexes ?? [];

  return (
    <Canvas
      testID="allocation-scene-canvas"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <FrozenRoundArtwork
        players={props.frozenRounds.roundOne}
        transform={props.roundOneTransform}
        opacity={props.roundOneOpacity}
        teamImages={teamResultImages}
      />
      <FrozenRoundArtwork
        players={props.frozenRounds.roundTwo}
        transform={props.roundTwoTransform}
        opacity={props.roundTwoOpacity}
        teamImages={teamResultImages}
      />
      {props.slots.map((slot, index) => (
        <LiveDotArtwork
          key={index}
          active={slot.active}
          x={slot.x}
          y={slot.y}
          opacity={slot.opacity}
          scale={slot.scale}
          shakeX={props.shakeX}
          holdProgress={props.holdProgress}
          sceneOpacity={props.liveSceneOpacity}
          shimmerClock={shimmerClock}
          team={slot.team}
          revealProgress={slot.revealProgress}
          showRevealedArtwork={revealedSlotIndexes.includes(index)}
        />
      ))}
    </Canvas>
  );
}

export default function TouchAllocationScene(props: TouchAllocationSceneProps) {
  const { width } = useWindowDimensions();
  const isMultiRound = props.isMultiRound;
  const round = props.configuration.round;
  const roundScrollX = props.roundScrollX;
  const controller = useTouchAllocationController({
    selectedTeams: props.configuration.selectedTeams,
    excludedRects: props.excludedRects,
    onReveal: (players) => {
      props.onReveal({ round: props.configuration.round, players });
    },
    acceptsNewTouches: props.configuration.acceptsNewTouches,
    isRoundNavigationIdle: props.isRoundNavigationIdle,
    expectedTouchCount: props.configuration.expectedTouchCount,
    allowOverExpected: props.configuration.allowOverExpected,
    roundAssignment: props.configuration.roundAssignment,
    isPairingModeEnabled: props.configuration.isPairingModeEnabled,
    resetKey: props.configuration.resetKey,
    exitRequested: props.exitRequested,
    onExitReady: props.onExitReady,
  });
  const hasFrozenCurrentRound =
    round === 0
      ? props.frozenRounds.roundOne.length > 0
      : props.frozenRounds.roundTwo.length > 0;
  const liveSceneOpacity = useDerivedValue(() => {
    if (hasFrozenCurrentRound) {
      return 0;
    }
    if (!isMultiRound) {
      return 1;
    }
    if (round === 0) {
      return interpolate(
        roundScrollX.get(),
        [0, width * 0.5, width],
        [1, 0, 0],
        Extrapolation.CLAMP,
      );
    }
    return interpolate(
      roundScrollX.get(),
      [0, width * 0.5, width],
      [0, 0, 1],
      Extrapolation.CLAMP,
    );
  });
  const roundOneTransform = useDerivedValue(() => [
    { translateX: isMultiRound ? -roundScrollX.get() : 0 },
  ]);
  const roundTwoTransform = useDerivedValue(() => [
    { translateX: isMultiRound ? width - roundScrollX.get() : 0 },
  ]);
  const roundOneOpacity = useDerivedValue(() =>
    isMultiRound
      ? interpolate(
          roundScrollX.get(),
          [0, width * 0.5, width],
          [1, 0.5, 0],
          Extrapolation.CLAMP,
        )
      : 1,
  );
  const roundTwoOpacity = useDerivedValue(() =>
    isMultiRound
      ? interpolate(
          roundScrollX.get(),
          [0, width * 0.5, width],
          [0, 0.5, 1],
          Extrapolation.CLAMP,
        )
      : 0,
  );
  const onTouchStateChange = props.onTouchStateChange;
  const liveSlots = controller.slotActive.map((active, index) => ({
    active,
    x: controller.slotX[index],
    y: controller.slotY[index],
    opacity: controller.slotOpacity[index],
    scale: controller.slotScale[index],
    team: controller.slotRevealTeams[index],
    revealProgress: controller.slotRevealProgress[index],
  }));
  useEffect(() => {
    onTouchStateChange({
      count: controller.touchCount,
      isTouching: controller.isTouching,
    });
  }, [controller.isTouching, controller.touchCount, onTouchStateChange]);

  return (
    <GestureDetector gesture={controller.touchGesture}>
      <View className={cn("flex-1")} style={{ backgroundColor: "transparent" }}>
        {props.children}
        <AllocationSceneCanvas
          slots={liveSlots}
          frozenRounds={props.frozenRounds}
          roundOneTransform={roundOneTransform}
          roundTwoTransform={roundTwoTransform}
          roundOneOpacity={roundOneOpacity}
          roundTwoOpacity={roundTwoOpacity}
          liveSceneOpacity={liveSceneOpacity}
          shakeX={controller.shakeX}
          holdProgress={controller.revealProgress}
          revealedSlotIndexes={controller.revealedAssignments.map(
            (assignment) => assignment.slotIndex,
          )}
        />
        <RevealedPlayerLabelLayer
          testID="round-one-labels"
          players={props.frozenRounds.roundOne}
          transform={roundOneTransform}
          opacity={roundOneOpacity}
          isAccessibilityVisible={round === 0}
        />
        <RevealedPlayerLabelLayer
          testID="round-two-labels"
          players={props.frozenRounds.roundTwo}
          transform={roundTwoTransform}
          opacity={roundTwoOpacity}
          isAccessibilityVisible={round === 1}
        />
        {controller.isRevealed && !hasFrozenCurrentRound
          ? controller.revealedAssignments.map((assignment) => (
              <LiveTeamLabel
                key={assignment.slotIndex}
                x={controller.slotX[assignment.slotIndex]}
                y={controller.slotY[assignment.slotIndex]}
                active={controller.slotActive[assignment.slotIndex]}
                opacity={controller.slotOpacity[assignment.slotIndex]}
                scale={controller.slotScale[assignment.slotIndex]}
                sceneOpacity={liveSceneOpacity}
                team={assignment.team}
              />
            ))
          : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  teamLabel: {
    position: "absolute",
    left: 0,
    top: 0,
    width: REVEAL_CIRCLE_SIZE,
    height: REVEAL_CIRCLE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
