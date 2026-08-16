import type { MultiRoundAssignmentPlan } from "../../domain/team-allocation";
import type { RevealedPlayer } from "../../domain/revealed-player";
import { describe, expect, it } from "vitest";
import { homeGameReducer, initialHomeGameState } from "./home-game-state";

const revealedPlayer: RevealedPlayer = { x: 100, y: 200, team: 1 };
const multiRoundPlan: MultiRoundAssignmentPlan = {
  roundOne: [1, 2, 3, 4, 1],
  roundTwo: [2, 3, 4],
};

describe("homeGameReducer", () => {
  it("enables pairing mode only during setup and clears it on Back", () => {
    const enabledState = homeGameReducer(initialHomeGameState, {
      type: "setPairingMode",
      isEnabled: true,
    });
    const disabledState = homeGameReducer(enabledState, {
      type: "setPairingMode",
      isEnabled: false,
    });
    const reenabledState = homeGameReducer(disabledState, {
      type: "setPairingMode",
      isEnabled: true,
    });
    const teamState = homeGameReducer(reenabledState, {
      type: "selectTeams",
      teamCount: 3,
    });
    const ignoredToggleState = homeGameReducer(teamState, {
      type: "setPairingMode",
      isEnabled: false,
    });
    const resetState = homeGameReducer(ignoredToggleState, {
      type: "backToTeamSelection",
    });

    expect(enabledState.isPairingModeEnabled).toBe(true);
    expect(disabledState.isPairingModeEnabled).toBe(false);
    expect(ignoredToggleState).toBe(teamState);
    expect(resetState.isPairingModeEnabled).toBe(false);
  });

  it("stores the completed assignment plan supplied by the event handler", () => {
    const enabledState = homeGameReducer(initialHomeGameState, {
      type: "setPairingMode",
      isEnabled: true,
    });
    const teamState = homeGameReducer(enabledState, {
      type: "selectTeams",
      teamCount: 4,
    });
    const state = homeGameReducer(teamState, {
      type: "selectPlayerCount",
      playerCount: 8,
      plan: multiRoundPlan,
    });

    expect(state.multiRoundPlan).toBe(multiRoundPlan);

    const replayedState = homeGameReducer(teamState, {
      type: "selectPlayerCount",
      playerCount: 8,
      plan: multiRoundPlan,
    });
    expect(replayedState).toEqual(state);
  });

  it("starts a clean game when a team count is selected", () => {
    const state = homeGameReducer(initialHomeGameState, {
      type: "selectTeams",
      teamCount: 3,
    });

    expect(state.selectedTeams).toBe(3);
    expect(state.roundResetKey).toBe(1);
    expect(state.isRoundOneFrozen).toBe(false);
  });

  it("creates and resets a multi-round session", () => {
    const teamState = homeGameReducer(initialHomeGameState, {
      type: "selectTeams",
      teamCount: 2,
    });
    const state = homeGameReducer(teamState, {
      type: "selectPlayerCount",
      playerCount: 8,
      plan: multiRoundPlan,
    });

    expect(state.declaredPlayerCount).toBe(8);
    expect(state.multiRoundPlan?.roundOne).toHaveLength(5);
    expect(state.multiRoundPlan?.roundTwo).toHaveLength(3);
    expect(state.currentRound).toBe(0);
    expect(state.roundResetKey).toBe(2);
  });

  it("freezes each round once", () => {
    const roundOneState = homeGameReducer(initialHomeGameState, {
      type: "revealRound",
      round: 0,
      players: [revealedPlayer],
    });
    const repeatedState = homeGameReducer(roundOneState, {
      type: "revealRound",
      round: 0,
      players: [],
    });

    expect(repeatedState).toBe(roundOneState);
    expect(repeatedState.roundOneSnapshot).toEqual([revealedPlayer]);
  });

  it("records the swipe hint and advances the reset key with the round", () => {
    const visibleState = homeGameReducer(initialHomeGameState, {
      type: "roundSwipeHintSeen",
    });
    const repeatedVisibleState = homeGameReducer(visibleState, {
      type: "roundSwipeHintSeen",
    });
    const state = homeGameReducer(visibleState, {
      type: "roundScrollFinished",
      round: 1,
    });

    expect(state.hasShownSwipeHint).toBe(true);
    expect(state.currentRound).toBe(1);
    expect(state.roundResetKey).toBe(1);
    expect(state.isRoundScrolling).toBe(false);
    expect(repeatedVisibleState).toBe(visibleState);
  });

  it("keeps repeated round completion idempotent", () => {
    const state = {
      ...initialHomeGameState,
      currentRound: 1,
      roundResetKey: 4,
    };
    const nextState = homeGameReducer(state, {
      type: "roundScrollFinished",
      round: 1,
    });

    expect(nextState.currentRound).toBe(1);
    expect(nextState.roundResetKey).toBe(4);
  });
});
