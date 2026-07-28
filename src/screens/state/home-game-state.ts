import {
  planMultiRoundAssignments,
  type MultiRoundAssignmentPlan,
} from "../../domain/team-allocation";
import type { FrozenDot } from "../../helpers/types/home-screen";

export type HomeGameState = {
  selectedTeams: number | null;
  declaredPlayerCount: number | null;
  multiRoundPlan: MultiRoundAssignmentPlan | null;
  currentRound: number;
  roundOneSnapshot: FrozenDot[];
  isRoundOneFrozen: boolean;
  roundTwoSnapshot: FrozenDot[];
  isRoundTwoFrozen: boolean;
  roundResetKey: number;
  isRoundTwoVisible: boolean;
  isRoundScrolling: boolean;
  hasShownSwipeHint: boolean;
};

export type HomeGameAction =
  | { type: "selectTeams"; teamCount: number }
  | { type: "selectPlayerCount"; playerCount: number }
  | { type: "backToTeamSelection" }
  | { type: "revealRound"; round: number; dots: FrozenDot[] }
  | { type: "roundVisibilityChanged"; isRoundTwoVisible: boolean }
  | { type: "roundScrollStarted" }
  | { type: "roundScrollDragEnded" }
  | { type: "roundScrollFinished"; round: number };

export const initialHomeGameState: HomeGameState = {
  selectedTeams: null,
  declaredPlayerCount: null,
  multiRoundPlan: null,
  currentRound: 0,
  roundOneSnapshot: [],
  isRoundOneFrozen: false,
  roundTwoSnapshot: [],
  isRoundTwoFrozen: false,
  roundResetKey: 0,
  isRoundTwoVisible: false,
  isRoundScrolling: false,
  hasShownSwipeHint: false,
};

const resetRoundState = (
  state: HomeGameState,
): Pick<
  HomeGameState,
  | "currentRound"
  | "roundOneSnapshot"
  | "isRoundOneFrozen"
  | "roundTwoSnapshot"
  | "isRoundTwoFrozen"
  | "roundResetKey"
  | "isRoundTwoVisible"
  | "isRoundScrolling"
  | "hasShownSwipeHint"
> => ({
  currentRound: 0,
  roundOneSnapshot: [],
  isRoundOneFrozen: false,
  roundTwoSnapshot: [],
  isRoundTwoFrozen: false,
  roundResetKey: state.roundResetKey + 1,
  isRoundTwoVisible: false,
  isRoundScrolling: false,
  hasShownSwipeHint: false,
});

export const homeGameReducer = (
  state: HomeGameState,
  action: HomeGameAction,
): HomeGameState => {
  if (action.type === "selectTeams") {
    return {
      ...state,
      selectedTeams: action.teamCount,
      declaredPlayerCount: null,
      multiRoundPlan: null,
      ...resetRoundState(state),
    };
  }

  if (action.type === "selectPlayerCount") {
    if (!state.selectedTeams) {
      return state;
    }

    return {
      ...state,
      declaredPlayerCount: action.playerCount,
      multiRoundPlan: planMultiRoundAssignments(
        state.selectedTeams,
        action.playerCount,
      ),
      ...resetRoundState(state),
    };
  }

  if (action.type === "backToTeamSelection") {
    return {
      ...state,
      selectedTeams: null,
      declaredPlayerCount: null,
      multiRoundPlan: null,
      ...resetRoundState(state),
    };
  }

  if (action.type === "revealRound") {
    if (action.round === 0 && !state.isRoundOneFrozen) {
      return {
        ...state,
        roundOneSnapshot: action.dots,
        isRoundOneFrozen: true,
      };
    }

    if (action.round === 1 && !state.isRoundTwoFrozen) {
      return {
        ...state,
        roundTwoSnapshot: action.dots,
        isRoundTwoFrozen: true,
      };
    }

    return state;
  }

  if (action.type === "roundVisibilityChanged") {
    return {
      ...state,
      isRoundTwoVisible: action.isRoundTwoVisible,
      hasShownSwipeHint: state.hasShownSwipeHint || action.isRoundTwoVisible,
    };
  }

  if (action.type === "roundScrollStarted") {
    return {
      ...state,
      isRoundScrolling: true,
    };
  }

  if (action.type === "roundScrollDragEnded") {
    return {
      ...state,
      isRoundScrolling: false,
    };
  }

  if (action.type === "roundScrollFinished") {
    return {
      ...state,
      currentRound: action.round,
      roundResetKey:
        action.round === state.currentRound
          ? state.roundResetKey
          : state.roundResetKey + 1,
      isRoundScrolling: false,
    };
  }

  return state;
};
