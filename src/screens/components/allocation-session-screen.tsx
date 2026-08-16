import { planMultiRoundAssignments } from "@/src/domain/team-allocation";
import type { RevealedPlayer } from "@/src/domain/revealed-player";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import {
  allocationSessionReducer,
  createAllocationSessionState,
  projectCurrentRound,
  type AllocationRound,
} from "@/src/screens/state/allocation-session-state";
import { cn } from "heroui-native";
import { useCallback, useMemo, useReducer, useState } from "react";
import { View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import AllocationBackButton from "./allocation-back-button";
import AllocationRoundNavigation from "./allocation-round-navigation";
import DialogMorePlayers from "./dialog-more-players";
import TouchAllocationScene from "./touch-allocation-scene";

export type AllocationSessionConfiguration = {
  selectedTeams: 2 | 3 | 4 | 5;
  isPairingModeEnabled: boolean;
};

const emptyTouchRect = (): TouchRect => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  isReady: false,
});

export default function AllocationSessionScreen(props: {
  configuration: AllocationSessionConfiguration;
  onExit: () => void;
}) {
  const [session, dispatchSession] = useReducer(
    allocationSessionReducer,
    undefined,
    createAllocationSessionState,
  );
  const [touchState, setTouchState] = useState({
    count: 0,
    isTouching: false,
  });
  const [isPlayerCountDialogOpen, setIsPlayerCountDialogOpen] = useState(false);
  const [isExitRequested, setIsExitRequested] = useState(false);
  const plusButtonRect = useSharedValue<TouchRect>(emptyTouchRect());
  const backButtonRect = useSharedValue<TouchRect>(emptyTouchRect());
  const excludedTouchRects = useMemo(
    () => [plusButtonRect, backButtonRect],
    [backButtonRect, plusButtonRect],
  );
  const currentRound = projectCurrentRound(
    session,
    props.configuration.selectedTeams,
  );
  const acceptsNewTouches =
    !currentRound.isFrozen && !isPlayerCountDialogOpen && !isExitRequested;

  const handlePlayerCountSelection = (playerCount: number) => {
    const plan = planMultiRoundAssignments(
      props.configuration.selectedTeams,
      playerCount,
      Math.random,
      { pairingMode: props.configuration.isPairingModeEnabled },
    );
    dispatchSession({ type: "selectPlayerCount", playerCount, plan });
  };
  const handleReveal = useCallback(
    (event: { round: AllocationRound; players: RevealedPlayer[] }) => {
      dispatchSession({
        type: "revealCompleted",
        round: event.round,
        players: event.players,
      });
    },
    [],
  );
  const handleTouchStateChange = useCallback(
    (nextState: { count: number; isTouching: boolean }) => {
      setTouchState((currentState) =>
        currentState.count === nextState.count &&
        currentState.isTouching === nextState.isTouching
          ? currentState
          : nextState,
      );
    },
    [],
  );
  const handleExitReady = () => {
    setIsExitRequested(false);
    dispatchSession({ type: "exitCompleted" });
    props.onExit();
  };

  return (
    <AllocationRoundNavigation
      state={{
        isMultiRound: currentRound.isMultiRound,
        currentRound: currentRound.round,
        playerCounts: {
          firstRound: currentRound.firstRoundCount,
          secondRound: currentRound.secondRoundCount,
          touching: touchState.count,
        },
        isTouching: touchState.isTouching,
        frozenRounds: {
          roundOne: session.isRoundOneFrozen,
          roundTwo: session.isRoundTwoFrozen,
        },
        hasShownSwipeHint: session.hasShownSwipeHint,
        resetKey: session.navigationResetKey,
      }}
      operations={{
        onSwipeHintSeen: () => dispatchSession({ type: "swipeHintSeen" }),
        onSettled: (round) =>
          dispatchSession({ type: "navigationSettled", round }),
      }}
    >
      {(navigation, navigationLayer) => (
        <TouchAllocationScene
          configuration={{
            selectedTeams: props.configuration.selectedTeams,
            round: currentRound.round,
            expectedTouchCount: currentRound.expectedTouchCount,
            allowOverExpected: currentRound.allowOverExpected,
            roundAssignment: currentRound.roundAssignment,
            isPairingModeEnabled: props.configuration.isPairingModeEnabled,
            acceptsNewTouches,
            resetKey: session.roundResetKey,
          }}
          excludedRects={excludedTouchRects}
          frozenRounds={{
            roundOne: session.roundOneSnapshot,
            roundTwo: session.roundTwoSnapshot,
          }}
          roundScrollX={navigation.scrollX}
          isRoundNavigationIdle={navigation.isIdle}
          isMultiRound={currentRound.isMultiRound}
          onReveal={handleReveal}
          onTouchStateChange={handleTouchStateChange}
          exitRequested={isExitRequested}
          onExitReady={handleExitReady}
        >
          <View
            className={cn("absolute top-16 right-6 z-10 items-center gap-2")}
          >
            <DialogMorePlayers
              selectedTeams={props.configuration.selectedTeams}
              onSelectPlayerCount={handlePlayerCountSelection}
              onOpenChange={setIsPlayerCountDialogOpen}
              plusButtonRectSv={plusButtonRect}
            />
          </View>
          {navigationLayer}
          <AllocationBackButton
            rect={backButtonRect}
            isDisabled={isExitRequested}
            onPress={() => setIsExitRequested(true)}
          />
        </TouchAllocationScene>
      )}
    </AllocationRoundNavigation>
  );
}
