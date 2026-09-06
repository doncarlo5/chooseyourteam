import { Quicksand_700Bold } from "@expo-google-fonts/quicksand";
import type { RevealedPlayer } from "@/src/domain/revealed-player";
import type { RoundAssignment, TeamNumber } from "@/src/domain/team-identity";
import { getGameThemeArtwork } from "@/src/game-themes/game-theme-artwork-registry";
import type { GameThemeId } from "@/src/game-themes/game-theme-id";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import type { GameThemeArtwork } from "@/src/game-themes/game-theme-types";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import { Inter_900Black } from "@expo-google-fonts/inter";
import {
  Blur,
  Canvas,
  CubicSampling,
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
import {
  getFrozenArtworkRasterMetrics,
  shouldRasterizeFrozenArtwork,
} from "../touch-allocation-rendering-policy";

const BASE_CIRCLE_SIZE = 120;
const REVEAL_CIRCLE_SIZE = 150;
// One proportion for every team leaves room inside the narrowest shape (the star).
const REVEAL_NUMBER_FONT_SIZE = REVEAL_CIRCLE_SIZE * 0.4;
const RASTER_ARTWORK_PADDING = 24;
const REVEALED_NUMBER_FONTS = {
  "desert-lagoon": Quicksand_700Bold,
  "coral-sky": Inter_900Black,
  "neon-arena": require("../../../assets/fonts/SpaceMono-Regular.ttf"),
};
const TEAM_NUMBERS = [1, 2, 3, 4, 5] as const;

function StaticRevealedNumber(props: {
  size: number;
  team: TeamNumber;
  font: SkFont;
  blur?: number;
}) {
  const text = String(props.team);
  const bounds = props.font.measureText(text);
  const x = (props.size - bounds.width) / 2 - bounds.x;
  const y = (props.size - bounds.height) / 2 - bounds.y;

  return (
    <>
      <SkiaText
        x={x}
        y={y}
        text={text}
        font={props.font}
        color="rgba(0,0,0,0.8)"
        style="stroke"
        strokeWidth={props.size * 0.025}
      >
        <Blur blur={props.blur ?? 1} mode="decal" />
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
    return bounds ? (props.size - bounds.width) / 2 - bounds.x : 0;
  });
  const y = useDerivedValue(() => {
    const bounds = widths[props.team.get() - 1];
    return bounds ? (props.size - bounds.height) / 2 - bounds.y : 0;
  });

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
        color="rgba(0,0,0,0.8)"
        style="stroke"
        strokeWidth={props.size * 0.025}
      >
        <Blur blur={1} mode="decal" />
      </SkiaText>
      <SkiaText x={x} y={y} text={text} font={props.font} color="white" />
    </>
  );
}

async function renderTeamResultImages(
  metrics: ReturnType<typeof getFrozenArtworkRasterMetrics>,
  RevealedDot: GameThemeArtwork["RevealedDot"],
  showRevealedNumber: boolean,
  font: SkFont | null,
) {
  return Promise.all(
    TEAM_NUMBERS.map((team) =>
      drawAsImage(
        <Group
          transform={[
            { translateX: metrics.physicalPadding },
            { translateY: metrics.physicalPadding },
          ]}
        >
          <RevealedDot size={metrics.physicalContentSize} team={team} />
          {showRevealedNumber && font ? (
            <StaticRevealedNumber
              size={metrics.physicalContentSize}
              team={team}
              font={font}
              blur={metrics.physicalContentSize / metrics.logicalContentSize}
            />
          ) : null}
        </Group>,
        {
          width: metrics.physicalImageSize,
          height: metrics.physicalImageSize,
        },
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
  metrics: ReturnType<typeof getFrozenArtworkRasterMetrics>,
  RevealedDot: GameThemeArtwork["RevealedDot"],
  showRevealedNumber: boolean,
  font: SkFont | null,
  setImages: (images: (SkImage | null)[]) => void,
) {
  if (!isEnabled || (showRevealedNumber && !font)) {
    return () => undefined;
  }
  let isCancelled = false;
  void renderTeamResultImages(
    metrics,
    RevealedDot,
    showRevealedNumber,
    font,
  ).then((images) => {
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

function useTeamResultImages(
  metrics: ReturnType<typeof getFrozenArtworkRasterMetrics>,
  isEnabled: boolean,
  RevealedDot: GameThemeArtwork["RevealedDot"],
  showRevealedNumber: boolean,
  font: SkFont | null,
) {
  const [images, setImages] = useState<(SkImage | null)[]>([]);

  function loadImagesEffect() {
    return loadTeamResultImages(
      isEnabled,
      metrics,
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
    metrics,
  ]);
  useEffect(disposeImagesEffect, [images]);
  return {
    images,
    isReady:
      !isEnabled ||
      (images.length === TEAM_NUMBERS.length && images.every(Boolean)),
  };
}

async function renderUnrevealedBaseImage(
  size: number,
  RasterizedBase: NonNullable<GameThemeArtwork["RasterizedUnrevealedBase"]>,
) {
  const pixelRatio = PixelRatio.get();
  const rasterSize = Math.ceil(size * pixelRatio);
  const rasterPadding = Math.ceil(RASTER_ARTWORK_PADDING * pixelRatio);
  return drawAsImage(
    <Group
      transform={[{ translateX: rasterPadding }, { translateY: rasterPadding }]}
    >
      <RasterizedBase size={rasterSize} />
    </Group>,
    {
      width: rasterSize + rasterPadding * 2,
      height: rasterSize + rasterPadding * 2,
    },
  );
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
  maximumTouchCount: number;
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
  onSelectSixPlayers?: () => void;
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
              x={-RASTER_ARTWORK_PADDING}
              y={-RASTER_ARTWORK_PADDING}
              width={BASE_CIRCLE_SIZE + RASTER_ARTWORK_PADDING * 2}
              height={BASE_CIRCLE_SIZE + RASTER_ARTWORK_PADDING * 2}
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
              x={-RASTER_ARTWORK_PADDING}
              y={-RASTER_ARTWORK_PADDING}
              width={REVEAL_CIRCLE_SIZE + RASTER_ARTWORK_PADDING * 2}
              height={REVEAL_CIRCLE_SIZE + RASTER_ARTWORK_PADDING * 2}
              sampling={CubicSampling}
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
      isVisuallyHidden
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
          isVisuallyHidden={props.isVisuallyHidden ?? true}
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
  const windowDimensions = useWindowDimensions();
  const activeThemeId = props.themeId ?? selectedThemeId;
  const artwork = props.artwork ?? getGameThemeArtwork(activeThemeId);
  const showRevealedNumber = true;
  const numberFontSource = REVEALED_NUMBER_FONTS[activeThemeId];
  const shouldRasterize = shouldRasterizeFrozenArtwork(Platform.OS);
  const liveShimmerClock = useClock();
  const rasterMetrics = useMemo(
    () =>
      getFrozenArtworkRasterMetrics(
        REVEAL_CIRCLE_SIZE,
        RASTER_ARTWORK_PADDING,
        windowDimensions.scale,
      ),
    [windowDimensions.scale],
  );
  const revealedNumberFont = useFont(numberFontSource, REVEAL_NUMBER_FONT_SIZE);
  const rasterRevealedNumberFont = useFont(
    shouldRasterize ? numberFontSource : null,
    REVEAL_NUMBER_FONT_SIZE *
      (rasterMetrics.physicalContentSize / rasterMetrics.logicalContentSize),
  );
  const teamResultImageCache = useTeamResultImages(
    rasterMetrics,
    shouldRasterize,
    artwork.RevealedDot,
    showRevealedNumber,
    rasterRevealedNumberFont,
  );
  const unrevealedBaseImage = useUnrevealedBaseImage(
    BASE_CIRCLE_SIZE,
    artwork.RasterizedUnrevealedBase,
  );
  const shimmerClock = props.shimmerClock ?? liveShimmerClock;
  const revealedSlotIndexes = props.revealedSlotIndexes ?? [];
  const hasFrozenArtwork =
    props.frozenRounds.roundOne.length > 0 ||
    props.frozenRounds.roundTwo.length > 0;
  const shouldKeepLastLiveFrame =
    shouldRasterize &&
    hasFrozenArtwork &&
    revealedSlotIndexes.length > 0 &&
    !teamResultImageCache.isReady;
  const effectiveLiveSceneOpacity = useDerivedValue(() =>
    shouldKeepLastLiveFrame ? 1 : props.liveSceneOpacity.get(),
  );
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
          teamImages={teamResultImageCache.images}
          RevealedDot={artwork.RevealedDot}
          revealedNumberFont={revealedNumberFont}
          showRevealedNumber={showRevealedNumber}
        />
        <FrozenRoundArtwork
          players={props.frozenRounds.roundTwo}
          transform={props.roundTwoTransform}
          opacity={props.roundTwoOpacity}
          teamImages={teamResultImageCache.images}
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
            sceneOpacity={effectiveLiveSceneOpacity}
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
    maximumTouchCount: props.configuration.maximumTouchCount,
    roundAssignment: props.configuration.roundAssignment,
    isPairingModeEnabled: props.configuration.isPairingModeEnabled,
    resetKey: props.configuration.resetKey,
    exitRequested: props.exitRequested,
    onExitReady: props.onExitReady,
    onSelectSixPlayers: props.onSelectSixPlayers,
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
