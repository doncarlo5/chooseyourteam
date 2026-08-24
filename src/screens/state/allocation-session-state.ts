import {
  planMultiRoundAssignments,
  type MultiRoundAssignmentPlan,
  type RandomSource,
} from "../../domain/team-allocation";
import type { RevealedPlayer } from "../../domain/revealed-player";
import type { AllocationSessionConfiguration } from "./allocation-setup-state";

export type AllocationRound = 0 | 1;

export type AllocationSessionState = {
  declaredPlayerCount: number | null;
  multiRoundPlan: MultiRoundAssignmentPlan | null;
  currentRound: AllocationRound;
  roundOneSnapshot: RevealedPlayer[];
  isRoundOneFrozen: boolean;
  roundTwoSnapshot: RevealedPlayer[];
  isRoundTwoFrozen: boolean;
  roundResetKey: number;
  navigationResetKey: number;
  hasShownSwipeHint: boolean;
};

export type AllocationSessionAction =
  | {
      type: "revealCompleted";
      round: AllocationRound;
      players: RevealedPlayer[];
    }
  | { type: "swipeHintSeen" }
  | { type: "navigationSettled"; round: number }
  | { type: "exitCompleted" };

export const createAllocationSessionState = (
  configuration?: AllocationSessionConfiguration,
  random: RandomSource = Math.random,
): AllocationSessionState => {
  const declaredPlayerCount =
    configuration?.playerSelection.mode === "declared"
      ? configuration.playerSelection.count
      : null;
  const multiRoundPlan =
    declaredPlayerCount === null || !configuration
      ? null
      : planMultiRoundAssignments(
          configuration.selectedTeams,
          declaredPlayerCount,
          random,
          { pairingMode: configuration.isPairingModeEnabled },
        );

  return {
    declaredPlayerCount,
    multiRoundPlan,
    currentRound: 0,
    roundOneSnapshot: [],
    isRoundOneFrozen: false,
    roundTwoSnapshot: [],
    isRoundTwoFrozen: false,
    roundResetKey: 0,
    navigationResetKey: 0,
    hasShownSwipeHint: false,
  };
};

export const clampAllocationRound = (round: number): AllocationRound =>
  round >= 1 ? 1 : 0;

export const allocationSessionReducer = (
  state: AllocationSessionState,
  action: AllocationSessionAction,
): AllocationSessionState => {
  if (action.type === "exitCompleted") {
    return createAllocationSessionState();
  }

  if (action.type === "revealCompleted") {
    if (action.round === 0 && !state.isRoundOneFrozen) {
      return {
        ...state,
        roundOneSnapshot: action.players,
        isRoundOneFrozen: true,
      };
    }
    if (action.round === 1 && !state.isRoundTwoFrozen) {
      return {
        ...state,
        roundTwoSnapshot: action.players,
        isRoundTwoFrozen: true,
      };
    }
    return state;
  }

  if (action.type === "swipeHintSeen") {
    if (state.hasShownSwipeHint) {
      return state;
    }
    return { ...state, hasShownSwipeHint: true };
  }

  if (action.type === "navigationSettled") {
    const round = clampAllocationRound(action.round);
    if (round === state.currentRound) {
      return state;
    }
    return {
      ...state,
      currentRound: round,
      roundResetKey:
        round === state.currentRound
          ? state.roundResetKey
          : state.roundResetKey + 1,
    };
  }

  return state;
};

export const projectCurrentRound = (
  state: AllocationSessionState,
  selectedTeams: number,
) => {
  const isMultiRound = state.declaredPlayerCount !== null;
  const firstRoundCount = isMultiRound ? 5 : selectedTeams;
  const secondRoundCount = state.declaredPlayerCount
    ? state.declaredPlayerCount - firstRoundCount
    : 0;
  const isFrozen =
    state.currentRound === 0 ? state.isRoundOneFrozen : state.isRoundTwoFrozen;

  return {
    round: state.currentRound,
    isMultiRound,
    firstRoundCount,
    secondRoundCount,
    expectedTouchCount:
      state.currentRound === 0 ? firstRoundCount : secondRoundCount,
    allowOverExpected: !isMultiRound,
    isFrozen,
    roundAssignment:
      state.currentRound === 0
        ? state.multiRoundPlan?.roundOne
        : state.multiRoundPlan?.roundTwo,
  };
};
