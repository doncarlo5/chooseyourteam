import type { FrozenDot } from "../../helpers/types/home-screen";
import { describe, expect, it } from "vitest";
import { homeGameReducer, initialHomeGameState } from "./home-game-state";

const frozenDot: FrozenDot = { x: 100, y: 200, team: 1 };

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

  it("plans the second and third declared players together when enabled", () => {
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
    });

    expect(state.multiRoundPlan?.roundOne[2]).toBe(
      state.multiRoundPlan?.roundOne[1],
    );
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
      dots: [frozenDot],
    });
    const repeatedState = homeGameReducer(roundOneState, {
      type: "revealRound",
      round: 0,
      dots: [],
    });

    expect(repeatedState).toBe(roundOneState);
    expect(repeatedState.roundOneSnapshot).toEqual([frozenDot]);
  });

  it("records the swipe hint and advances the reset key with the round", () => {
    const visibleState = homeGameReducer(initialHomeGameState, {
      type: "roundVisibilityChanged",
      isRoundTwoVisible: true,
    });
    const state = homeGameReducer(visibleState, {
      type: "roundScrollFinished",
      round: 1,
    });

    expect(state.hasShownSwipeHint).toBe(true);
    expect(state.currentRound).toBe(1);
    expect(state.roundResetKey).toBe(1);
    expect(state.isRoundScrolling).toBe(false);
  });
});
