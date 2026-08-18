import { AppText } from "@/src/components/app-text";
import type { RevealedPlayer } from "@/src/domain/revealed-player";
import type { TeamNumber } from "@/src/domain/team-identity";
import {
  AllocationSceneCanvas,
  type AllocationLiveSlot,
  RevealedPlayerLabelLayer,
} from "@/src/screens/components/touch-allocation-scene-content";
import RevealedPlayerLabel from "@/src/screens/components/revealed-player-label";
import useSlotSharedValues from "@/src/screens/components/use-slot-shared-values";
import { useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { makeMutable, withSpring, withTiming } from "react-native-reanimated";
import { scheduleOnUI } from "react-native-worklets";

const activePositions = [
  { x: 92, y: 300 },
  { x: 198, y: 420 },
  { x: 300, y: 310 },
];
const revealedTeams: TeamNumber[] = [1, 2, 3];

export default function TouchAllocationVisualFixture() {
  const params = useLocalSearchParams<{
    state?: string;
    round?: string;
    frozenCount?: string;
    transitionMode?: string;
  }>();
  const { width } = useWindowDimensions();
  const fixtureState = params.state ?? "unrevealed";
  const isRevealed = fixtureState === "revealed";
  const isFrozen = fixtureState === "frozen";
  const isScrolling = fixtureState === "scrolling";
  const isRoundTwoDynamic = fixtureState === "round-two-dynamic";
  const isDynamic = fixtureState === "dynamic" || isRoundTwoDynamic;
  const slotActive = useSlotSharedValues(0);
  const slotX = useSlotSharedValues(0);
  const slotY = useSlotSharedValues(0);
  const slotOpacity = useSlotSharedValues(isDynamic ? 0 : 1);
  const slotScale = useSlotSharedValues(1);
  const slotTeam = useSlotSharedValues(0);
  const slotRevealProgress = useSlotSharedValues(0);
  const holdProgress = fixtureState === "countdown" ? 0.72 : 0.18;
  const activeRound = params.round === "1" ? 1 : 0;
  const frozenCount = Math.max(
    0,
    Math.min(5, Number.parseInt(params.frozenCount ?? "5", 10) || 0),
  );
  const transitionMode = params.transitionMode ?? "both";
  const slots = useMemo<AllocationLiveSlot[]>(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const position = activePositions[index] ?? { x: 0, y: 0 };
        return {
          active: isDynamic
            ? slotActive[index]
            : makeMutable(
                index < activePositions.length && !isFrozen && !isScrolling
                  ? 1
                  : 0,
              ),
          x: isDynamic ? slotX[index] : makeMutable(position.x),
          y: isDynamic ? slotY[index] : makeMutable(position.y),
          opacity: slotOpacity[index],
          scale: slotScale[index],
          team: isDynamic
            ? slotTeam[index]
            : makeMutable(isRevealed ? (revealedTeams[index] ?? 0) : 0),
          revealProgress: isDynamic
            ? slotRevealProgress[index]
            : makeMutable(isRevealed ? 1 : 0),
        };
      }),
    [
      isDynamic,
      isFrozen,
      isRevealed,
      isScrolling,
      slotActive,
      slotOpacity,
      slotRevealProgress,
      slotScale,
      slotTeam,
      slotX,
      slotY,
    ],
  );
  const frozenRounds = useMemo<{
    roundOne: RevealedPlayer[];
    roundTwo: RevealedPlayer[];
  }>(() => {
    if (!isFrozen && !isScrolling && !isRoundTwoDynamic) {
      return { roundOne: [], roundTwo: [] };
    }
    const roundTwo = [
      { x: 95, y: 300, team: 4 as const },
      { x: 285, y: 420, team: 5 as const },
    ];
    const roundOne: RevealedPlayer[] = isRoundTwoDynamic
      ? [
          { x: 300, y: 600, team: 1 },
          { x: 100, y: 620, team: 2 },
          { x: 275, y: 540, team: 3 },
          { x: 100, y: 520, team: 1 },
          { x: 200, y: 650, team: 2 },
        ]
      : [
          { x: 90, y: 310, team: 1 },
          { x: 195, y: 430, team: 2 },
          { x: 300, y: 320, team: 3 },
        ];
    return {
      roundOne: roundOne.slice(0, frozenCount),
      roundTwo: isScrolling || activeRound === 1 ? roundTwo : [],
    };
  }, [activeRound, frozenCount, isFrozen, isRoundTwoDynamic, isScrolling]);
  const buffers = useMemo(() => {
    const scrollOffset = isScrolling
      ? width * 0.5
      : activeRound === 1
        ? width
        : 0;
    return {
      roundOneTransform: makeMutable([{ translateX: -scrollOffset }]),
      roundTwoTransform: makeMutable([
        { translateX: isScrolling ? width - scrollOffset : width },
      ]),
      roundOneOpacity: makeMutable(
        isScrolling ? 0.5 : activeRound === 0 ? 1 : 0,
      ),
      roundTwoOpacity: makeMutable(
        isScrolling ? 0.5 : activeRound === 1 ? 1 : 0,
      ),
      liveSceneOpacity: makeMutable(1),
      shakeX: makeMutable(0),
      holdProgress: makeMutable(holdProgress),
      shimmerClock: makeMutable(450),
    };
  }, [activeRound, holdProgress, isScrolling, width]);
  const activateDynamicSlots = useCallback(() => {
    "worklet";
    if (isRoundTwoDynamic) {
      if (transitionMode === "both" || transitionMode === "transform") {
        buffers.roundOneTransform.set([{ translateX: -width }]);
        buffers.roundTwoTransform.set([{ translateX: 0 }]);
      }
      if (transitionMode === "both" || transitionMode === "opacity") {
        buffers.roundOneOpacity.set(0);
        buffers.roundTwoOpacity.set(1);
      }
      buffers.liveSceneOpacity.set(1);
    }
    for (let index = 0; index < 2; index += 1) {
      slots[index].x.set(activePositions[index].x);
      slots[index].y.set(activePositions[index].y);
      slots[index].team.set(0);
      slots[index].revealProgress.set(0);
      slots[index].active.set(1);
      slots[index].opacity.set(0);
      slots[index].scale.set(0.7);
      slots[index].opacity.set(withTiming(1, { duration: 120 }));
      slots[index].scale.set(
        withSpring(1, {
          damping: 40,
          stiffness: 5000,
        }),
      );
    }
  }, [buffers, isRoundTwoDynamic, slots, transitionMode, width]);

  function activateDynamicSlotsEffect() {
    if (isDynamic) {
      scheduleOnUI(activateDynamicSlots);
    }
  }

  useEffect(activateDynamicSlotsEffect, [activateDynamicSlots, isDynamic]);

  const visiblePlayers = isRevealed
    ? activePositions.map((position, index) => ({
        ...position,
        team: revealedTeams[index],
      }))
    : [];

  return (
    <View
      testID="allocation-scene-fixture"
      className={cn("flex-1 bg-emerald-200")}
    >
      <AppText className={cn("pt-20 text-center text-3xl text-black/70")}>
        Allocation scene: {fixtureState}
      </AppText>
      <AllocationSceneCanvas
        slots={slots}
        frozenRounds={frozenRounds}
        roundOneTransform={buffers.roundOneTransform}
        roundTwoTransform={buffers.roundTwoTransform}
        roundOneOpacity={buffers.roundOneOpacity}
        roundTwoOpacity={buffers.roundTwoOpacity}
        liveSceneOpacity={buffers.liveSceneOpacity}
        shakeX={buffers.shakeX}
        holdProgress={buffers.holdProgress}
        shimmerClock={buffers.shimmerClock}
        revealedSlotIndexes={isRevealed ? [0, 1, 2] : []}
      />
      {visiblePlayers.map((player, index) => (
        <RevealedPlayerLabel
          key={`${player.x}-${player.y}-${player.team}-${index}`}
          team={player.team}
          style={[
            styles.label,
            {
              transform: [
                { translateX: player.x - 75 },
                { translateY: player.y - 75 },
              ],
            },
          ]}
        />
      ))}
      {!isRevealed ? (
        <>
          <RevealedPlayerLabelLayer
            testID="fixture-round-one-labels"
            players={frozenRounds.roundOne}
            transform={buffers.roundOneTransform}
            opacity={buffers.roundOneOpacity}
            isAccessibilityVisible={activeRound === 0}
          />
          <RevealedPlayerLabelLayer
            testID="fixture-round-two-labels"
            players={frozenRounds.roundTwo}
            transform={buffers.roundTwoTransform}
            opacity={buffers.roundTwoOpacity}
            isAccessibilityVisible={activeRound === 1}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 150,
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
});
