import { type MultiRoundAssignmentPlan } from "../../domain/team-allocation";
import type { RevealedPlayer } from "../../domain/revealed-player";

export type HomeGameState = {
  isPairingModeEnabled: boolean;
  selectedTeams: number | null;
  declaredPlayerCount: number | null;
  multiRoundPlan: MultiRoundAssignmentPlan | null;
  currentRound: number;
  roundOneSnapshot: RevealedPlayer[];
  isRoundOneFrozen: boolean;
  roundTwoSnapshot: RevealedPlayer[];
  isRoundTwoFrozen: boolean;
  roundResetKey: number;
  isRoundScrolling: boolean;
  hasShownSwipeHint: boolean;
};

export type HomeGameAction =
  | { type: "setPairingMode"; isEnabled: boolean }
  | { type: "selectTeams"; teamCount: number }
  | {
      type: "selectPlayerCount";
      playerCount: number;
      plan: MultiRoundAssignmentPlan;
    }
  | { type: "backToTeamSelection" }
  | { type: "revealRound"; round: number; players: RevealedPlayer[] }
  | { type: "roundSwipeHintSeen" }
  | { type: "roundScrollStarted" }
  | { type: "roundScrollDragEnded" }
  | { type: "roundScrollFinished"; round: number };

export const initialHomeGameState: HomeGameState = {
  isPairingModeEnabled: false,
  selectedTeams: null,
  declaredPlayerCount: null,
  multiRoundPlan: null,
  currentRound: 0,
  roundOneSnapshot: [],
  isRoundOneFrozen: false,
  roundTwoSnapshot: [],
  isRoundTwoFrozen: false,
  roundResetKey: 0,
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
  | "isRoundScrolling"
  | "hasShownSwipeHint"
> => ({
  currentRound: 0,
  roundOneSnapshot: [],
  isRoundOneFrozen: false,
  roundTwoSnapshot: [],
  isRoundTwoFrozen: false,
  roundResetKey: state.roundResetKey + 1,
  isRoundScrolling: false,
  hasShownSwipeHint: false,
});

export const homeGameReducer = (
  state: HomeGameState,
  action: HomeGameAction,
): HomeGameState => {
  if (action.type === "setPairingMode") {
    if (
      state.selectedTeams ||
      state.isPairingModeEnabled === action.isEnabled
    ) {
      return state;
    }

    return {
      ...state,
      isPairingModeEnabled: action.isEnabled,
    };
  }

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
      multiRoundPlan: action.plan,
      ...resetRoundState(state),
    };
  }

  if (action.type === "backToTeamSelection") {
    return {
      ...state,
      isPairingModeEnabled: false,
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

  if (action.type === "roundSwipeHintSeen") {
    if (state.hasShownSwipeHint) {
      return state;
    }

    return {
      ...state,
      hasShownSwipeHint: true,
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
