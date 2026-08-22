import type { RevealedPlayer } from "@/src/domain/revealed-player";
import type { RoundAssignment, TeamNumber } from "@/src/domain/team-identity";
import { getGameThemeArtwork } from "@/src/game-themes/game-theme-artwork-registry";
import type { GameThemeId } from "@/src/game-themes/game-theme-id";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import type { GameThemeArtwork } from "@/src/game-themes/game-theme-types";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter";
import {
  BlurMask,
  Canvas,
  drawAsImage,
  Group,
  Image,
  type SkFont,
  type SkImage,
  Text as SkiaText,
  useClock,
  useFont,
  vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "heroui-native";
import {
  PixelRatio,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import RevealedPlayerLabel from "./revealed-player-label";
import useTouchAllocationController from "./use-touch-allocation-controller";
import { shouldRasterizeFrozenArtwork } from "../touch-allocation-rendering-policy";

const BASE_CIRCLE_SIZE = 120;
const REVEAL_CIRCLE_SIZE = 150;
const REVEAL_NUMBER_FONT_SIZE = 72;
const TEAM_ONE_OPTICAL_OFFSET_X = -3;
const TEAM_NUMBERS = [1, 2, 3, 4, 5] as const;

function getRevealedNumberBaseline(size: number, font: SkFont) {
  const metrics = font.getMetrics();
  return size / 2 - (metrics.ascent + metrics.descent) / 2;
}

function getRevealedNumberOffsetX(team: number) {
  "worklet";
  return team === 1 ? TEAM_ONE_OPTICAL_OFFSET_X : 0;
}

function StaticRevealedNumber(props: {
  size: number;
  team: TeamNumber;
  font: SkFont;
}) {
  const text = String(props.team);
  const bounds = props.font.measureText(text);
  const x =
    (props.size - bounds.width) / 2 -
    bounds.x +
    getRevealedNumberOffsetX(props.team);
  const y = getRevealedNumberBaseline(props.size, props.font);

  return (
    <>
      <SkiaText
        x={x}
        y={y}
        text={text}
        font={props.font}
        color="white"
        opacity={0.75}
      >
        <BlurMask blur={5} style="solid" respectCTM={false} />
      </SkiaText>
      <SkiaText x={x} y={y} text={text} font={props.font} color="white" />
    </>
  );
}

function SharedRevealedNumber(props: {
  size: number;
  team: SharedValue<number>;
  font: SkFont | null;
}) {
  const widths = useMemo(
    () =>
      TEAM_NUMBERS.map((team) =>
        props.font ? props.font.measureText(String(team)) : null,
      ),
    [props.font],
  );
  const text = useDerivedValue(() => String(props.team.get()));
  const x = useDerivedValue(() => {
    const bounds = widths[props.team.get() - 1];
    return bounds
      ? (props.size - bounds.width) / 2 -
          bounds.x +
          getRevealedNumberOffsetX(props.team.get())
      : 0;
  });
  const y = props.font ? getRevealedNumberBaseline(props.size, props.font) : 0;

  if (!props.font) {
    return null;
  }

  return (
    <>
      <SkiaText
        x={x}
        y={y}
        text={text}
        font={props.font}
        color="white"
        opacity={0.75}
      >
        <BlurMask blur={5} style="solid" respectCTM={false} />
      </SkiaText>
      <SkiaText x={x} y={y} text={text} font={props.font} color="white" />
    </>
  );
}

async function renderTeamResultImages(
  size: number,
  RevealedDot: GameThemeArtwork["RevealedDot"],
  showRevealedNumber: boolean,
  font: SkFont | null,
) {
  return Promise.all(
    TEAM_NUMBERS.map((team) =>
      drawAsImage(
        <>
          <RevealedDot size={size} team={team} />
          {showRevealedNumber && font ? (
            <StaticRevealedNumber size={size} team={team} font={font} />
          ) : null}
        </>,
        { width: size, height: size },
      ),
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
  RevealedDot: GameThemeArtwork["RevealedDot"],
  showRevealedNumber: boolean,
  font: SkFont | null,
  setImages: (images: (SkImage | null)[]) => void,
) {
  if (!isEnabled || (showRevealedNumber && !font)) {
    return () => undefined;
  }
  let isCancelled = false;
  void renderTeamResultImages(size, RevealedDot, showRevealedNumber, font).then(
    (images) => {
      if (isCancelled) {
        disposeTeamResultImages(images);
        return;
      }
      setImages(images);
    },
  );
  return () => {
    isCancelled = true;
  };
}

function useTeamResultImages(
  size: number,
  isEnabled: boolean,
  RevealedDot: GameThemeArtwork["RevealedDot"],
  showRevealedNumber: boolean,
  font: SkFont | null,
) {
  const [images, setImages] = useState<(SkImage | null)[]>([]);

  function loadImagesEffect() {
    return loadTeamResultImages(
      isEnabled,
      size,
      RevealedDot,
      showRevealedNumber,
      font,
      setImages,
    );
  }

  function disposeImagesEffect() {
    return () => disposeTeamResultImages(images);
  }

  useEffect(loadImagesEffect, [
    font,
    isEnabled,
    RevealedDot,
    showRevealedNumber,
    size,
  ]);
  useEffect(disposeImagesEffect, [images]);
  return images;
}

async function renderUnrevealedBaseImage(
  size: number,
  RasterizedBase: NonNullable<GameThemeArtwork["RasterizedUnrevealedBase"]>,
) {
  const pixelRatio = PixelRatio.get();
  const rasterSize = Math.ceil(size * pixelRatio);
  return drawAsImage(<RasterizedBase size={rasterSize} />, {
    width: rasterSize,
    height: rasterSize,
  });
}

function loadUnrevealedBaseImage(
  size: number,
  RasterizedBase: GameThemeArtwork["RasterizedUnrevealedBase"],
  setImage: (image: SkImage | null) => void,
) {
  if (!RasterizedBase || Platform.OS === "web") {
    setImage(null);
    return () => undefined;
  }
  let isCancelled = false;
  void renderUnrevealedBaseImage(size, RasterizedBase).then((image) => {
    if (isCancelled) {
      image?.dispose();
      return;
    }
    setImage(image);
  });
  return () => {
    isCancelled = true;
  };
}

function useUnrevealedBaseImage(
  size: number,
  RasterizedBase: GameThemeArtwork["RasterizedUnrevealedBase"],
) {
  const [image, setImage] = useState<SkImage | null>(null);

  function loadImageEffect() {
    return loadUnrevealedBaseImage(size, RasterizedBase, setImage);
  }

  function disposeImageEffect() {
    return () => image?.dispose();
  }

  useEffect(loadImageEffect, [RasterizedBase, size]);
  useEffect(disposeImageEffect, [image]);
  return image;
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
  artwork: GameThemeArtwork;
  unrevealedBaseImage: SkImage | null;
  revealedNumberFont: SkFont | null;
  showRevealedNumber: boolean;
}) {
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
  const UnrevealedDot = props.artwork.UnrevealedDot;
  const UnrevealedOverlay = props.artwork.UnrevealedOverlay;
  const SharedRevealedDot = props.artwork.SharedRevealedDot;

  return (
    <>
      <Group
        origin={vec(BASE_CIRCLE_SIZE / 2, BASE_CIRCLE_SIZE / 2)}
        transform={unrevealedTransform}
        opacity={unrevealedOpacity}
      >
        {props.unrevealedBaseImage && UnrevealedOverlay ? (
          <>
            <Image
              image={props.unrevealedBaseImage}
              x={0}
              y={0}
              width={BASE_CIRCLE_SIZE}
              height={BASE_CIRCLE_SIZE}
            />
            <UnrevealedOverlay
              size={BASE_CIRCLE_SIZE}
              holdProgress={props.holdProgress}
              clock={props.shimmerClock}
            />
          </>
        ) : (
          <UnrevealedDot
            size={BASE_CIRCLE_SIZE}
            holdProgress={props.holdProgress}
            clock={props.shimmerClock}
          />
        )}
      </Group>
      {props.showRevealedArtwork ? (
        <Group
          origin={vec(REVEAL_CIRCLE_SIZE / 2, REVEAL_CIRCLE_SIZE / 2)}
          transform={revealedTransform}
          opacity={revealedOpacity}
        >
          <SharedRevealedDot size={REVEAL_CIRCLE_SIZE} team={props.team} />
          {props.showRevealedNumber ? (
            <SharedRevealedNumber
              size={REVEAL_CIRCLE_SIZE}
              team={props.team}
              font={props.revealedNumberFont}
            />
          ) : null}
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
  RevealedDot: GameThemeArtwork["RevealedDot"];
  revealedNumberFont: SkFont | null;
  showRevealedNumber: boolean;
}) {
  const shouldRasterize = shouldRasterizeFrozenArtwork(Platform.OS);

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
          {shouldRasterize ? (
            <Image
              image={props.teamImages[player.team - 1] ?? null}
              x={0}
              y={0}
              width={REVEAL_CIRCLE_SIZE}
              height={REVEAL_CIRCLE_SIZE}
            />
          ) : (
            <>
              <props.RevealedDot size={REVEAL_CIRCLE_SIZE} team={player.team} />
              {props.showRevealedNumber && props.revealedNumberFont ? (
                <StaticRevealedNumber
                  size={REVEAL_CIRCLE_SIZE}
                  team={player.team}
                  font={props.revealedNumberFont}
                />
              ) : null}
            </>
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
  isVisuallyHidden?: boolean;
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
          isVisuallyHidden={props.isVisuallyHidden}
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
  themeId?: GameThemeId;
  artwork?: GameThemeArtwork;
}) {
  const { themeId: selectedThemeId } = useGameTheme();
  const activeThemeId = props.themeId ?? selectedThemeId;
  const artwork = props.artwork ?? getGameThemeArtwork(activeThemeId);
  const showRevealedNumber = activeThemeId === "neon-arena";
  const liveShimmerClock = useClock();
  const revealedNumberFont = useFont(
    Inter_800ExtraBold,
    REVEAL_NUMBER_FONT_SIZE,
  );
  const shouldRasterize = shouldRasterizeFrozenArtwork(Platform.OS);
  const teamResultImages = useTeamResultImages(
    REVEAL_CIRCLE_SIZE,
    shouldRasterize,
    artwork.RevealedDot,
    showRevealedNumber,
    revealedNumberFont,
  );
  const unrevealedBaseImage = useUnrevealedBaseImage(
    BASE_CIRCLE_SIZE,
    artwork.RasterizedUnrevealedBase,
  );
  const shimmerClock = props.shimmerClock ?? liveShimmerClock;
  const revealedSlotIndexes = props.revealedSlotIndexes ?? [];
  const activeUnrevealedBaseImage =
    revealedSlotIndexes.length === 0 ? unrevealedBaseImage : null;

  return (
    <View
      testID="allocation-scene-canvas"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        <FrozenRoundArtwork
          players={props.frozenRounds.roundOne}
          transform={props.roundOneTransform}
          opacity={props.roundOneOpacity}
          teamImages={teamResultImages}
          RevealedDot={artwork.RevealedDot}
          revealedNumberFont={revealedNumberFont}
          showRevealedNumber={showRevealedNumber}
        />
        <FrozenRoundArtwork
          players={props.frozenRounds.roundTwo}
          transform={props.roundTwoTransform}
          opacity={props.roundTwoOpacity}
          teamImages={teamResultImages}
          RevealedDot={artwork.RevealedDot}
          revealedNumberFont={revealedNumberFont}
          showRevealedNumber={showRevealedNumber}
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
            artwork={artwork}
            unrevealedBaseImage={activeUnrevealedBaseImage}
            revealedNumberFont={revealedNumberFont}
            showRevealedNumber={showRevealedNumber}
          />
        ))}
      </Canvas>
    </View>
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
