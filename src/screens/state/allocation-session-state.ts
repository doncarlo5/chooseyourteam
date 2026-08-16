import type { MultiRoundAssignmentPlan } from "@/src/domain/team-allocation";
import type { RevealedPlayer } from "@/src/domain/revealed-player";

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
  isRoundScrolling: boolean;
  hasShownSwipeHint: boolean;
};

export type AllocationSessionAction =
  | {
      type: "selectPlayerCount";
      playerCount: number;
      plan: MultiRoundAssignmentPlan;
    }
  | {
      type: "revealCompleted";
      round: AllocationRound;
      players: RevealedPlayer[];
    }
  | { type: "swipeHintSeen" }
  | { type: "navigationStarted" }
  | { type: "navigationCancelled" }
  | { type: "navigationSettled"; round: number };

export const createAllocationSessionState = (): AllocationSessionState => ({
  declaredPlayerCount: null,
  multiRoundPlan: null,
  currentRound: 0,
  roundOneSnapshot: [],
  isRoundOneFrozen: false,
  roundTwoSnapshot: [],
  isRoundTwoFrozen: false,
  roundResetKey: 0,
  navigationResetKey: 0,
  isRoundScrolling: false,
  hasShownSwipeHint: false,
});

const resetRounds = (
  state: AllocationSessionState,
): Pick<
  AllocationSessionState,
  | "currentRound"
  | "roundOneSnapshot"
  | "isRoundOneFrozen"
  | "roundTwoSnapshot"
  | "isRoundTwoFrozen"
  | "roundResetKey"
  | "navigationResetKey"
  | "isRoundScrolling"
  | "hasShownSwipeHint"
> => ({
  currentRound: 0,
  roundOneSnapshot: [],
  isRoundOneFrozen: false,
  roundTwoSnapshot: [],
  isRoundTwoFrozen: false,
  roundResetKey: state.roundResetKey + 1,
  navigationResetKey: state.navigationResetKey + 1,
  isRoundScrolling: false,
  hasShownSwipeHint: false,
});

export const clampAllocationRound = (round: number): AllocationRound =>
  round >= 1 ? 1 : 0;

export const allocationSessionReducer = (
  state: AllocationSessionState,
  action: AllocationSessionAction,
): AllocationSessionState => {
  if (action.type === "selectPlayerCount") {
    return {
      ...state,
      declaredPlayerCount: action.playerCount,
      multiRoundPlan: action.plan,
      ...resetRounds(state),
    };
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

  if (action.type === "navigationStarted") {
    if (state.isRoundScrolling) {
      return state;
    }
    return { ...state, isRoundScrolling: true };
  }

  if (action.type === "navigationCancelled") {
    if (!state.isRoundScrolling) {
      return state;
    }
    return { ...state, isRoundScrolling: false };
  }

  if (action.type === "navigationSettled") {
    const round = clampAllocationRound(action.round);
    if (round === state.currentRound && !state.isRoundScrolling) {
      return state;
    }
    return {
      ...state,
      currentRound: round,
      roundResetKey:
        round === state.currentRound
          ? state.roundResetKey
          : state.roundResetKey + 1,
      isRoundScrolling: false,
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
