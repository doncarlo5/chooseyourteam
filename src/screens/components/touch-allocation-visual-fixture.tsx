import { AppText } from "@/src/components/app-text";
import type { RevealedPlayer } from "@/src/domain/revealed-player";
import type { TeamNumber } from "@/src/domain/team-identity";
import {
  AllocationSceneCanvas,
  type AllocationLiveSlot,
  RevealedPlayerLabelLayer,
} from "@/src/screens/components/touch-allocation-scene-content";
import RevealedPlayerLabel from "@/src/screens/components/revealed-player-label";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { makeMutable } from "react-native-reanimated";

const activePositions = [
  { x: 92, y: 300 },
  { x: 198, y: 420 },
  { x: 300, y: 310 },
];
const revealedTeams: TeamNumber[] = [1, 2, 3];

export default function TouchAllocationVisualFixture() {
  const params = useLocalSearchParams<{ state?: string }>();
  const { width } = useWindowDimensions();
  const fixtureState = params.state ?? "unrevealed";
  const isRevealed = fixtureState === "revealed";
  const isFrozen = fixtureState === "frozen";
  const isScrolling = fixtureState === "scrolling";
  const holdProgress = fixtureState === "countdown" ? 0.72 : 0.18;
  const slots = useMemo<AllocationLiveSlot[]>(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const position = activePositions[index] ?? { x: 0, y: 0 };
        return {
          active: makeMutable(
            index < activePositions.length && !isFrozen && !isScrolling ? 1 : 0,
          ),
          x: makeMutable(position.x),
          y: makeMutable(position.y),
          opacity: makeMutable(1),
          scale: makeMutable(1),
          team: makeMutable(isRevealed ? (revealedTeams[index] ?? 0) : 0),
          revealProgress: makeMutable(isRevealed ? 1 : 0),
        };
      }),
    [isFrozen, isRevealed, isScrolling],
  );
  const frozenRounds = useMemo<{
    roundOne: RevealedPlayer[];
    roundTwo: RevealedPlayer[];
  }>(() => {
    if (!isFrozen && !isScrolling) {
      return { roundOne: [], roundTwo: [] };
    }
    return {
      roundOne: [
        { x: 90, y: 310, team: 1 },
        { x: 195, y: 430, team: 2 },
        { x: 300, y: 320, team: 3 },
      ],
      roundTwo: isScrolling
        ? [
            { x: 95, y: 300, team: 4 },
            { x: 285, y: 420, team: 5 },
          ]
        : [],
    };
  }, [isFrozen, isScrolling]);
  const buffers = useMemo(() => {
    const scrollOffset = isScrolling ? width * 0.5 : 0;
    return {
      roundOneTransform: makeMutable([{ translateX: -scrollOffset }]),
      roundTwoTransform: makeMutable([
        { translateX: isScrolling ? width - scrollOffset : width },
      ]),
      roundOneOpacity: makeMutable(isScrolling ? 0.5 : 1),
      roundTwoOpacity: makeMutable(isScrolling ? 0.5 : 0),
      liveSceneOpacity: makeMutable(1),
      shakeX: makeMutable(0),
      holdProgress: makeMutable(holdProgress),
      shimmerClock: makeMutable(450),
    };
  }, [holdProgress, isScrolling, width]);

  const visiblePlayers = isRevealed
    ? activePositions.map((position, index) => ({
        ...position,
        team: revealedTeams[index],
      }))
    : [];

  return (
    <View testID="allocation-scene-fixture" className="flex-1 bg-emerald-200">
      <AppText className="pt-20 text-center text-3xl text-black/70">
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
            isAccessibilityVisible
          />
          <RevealedPlayerLabelLayer
            testID="fixture-round-two-labels"
            players={frozenRounds.roundTwo}
            transform={buffers.roundTwoTransform}
            opacity={buffers.roundTwoOpacity}
            isAccessibilityVisible={false}
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
