import type { RevealedPlayer } from "@/src/domain/revealed-player";
import {
  MAX_OBSERVED_PLAYER_COUNT,
  MAX_PLANNED_ROUND_PLAYER_COUNT,
} from "../../domain/team-allocation";
import { describe, expect, it } from "vitest";
import type {
  AllocationSessionConfiguration,
  DeclaredPlayerCount,
} from "./allocation-setup-state";
import {
  allocationSessionReducer,
  createAllocationSessionState,
  projectCurrentRound,
} from "./allocation-session-state";

const revealedPlayer: RevealedPlayer = { x: 100, y: 200, team: 1 };
const createDeclaredConfiguration = (
  count: DeclaredPlayerCount,
): AllocationSessionConfiguration => ({
  selectedTeams: 4,
  playerSelection: { mode: "declared", count },
  maximumObservedPlayerCount: MAX_PLANNED_ROUND_PLAYER_COUNT,
  isPairingModeEnabled: false,
});
const observedConfiguration: AllocationSessionConfiguration = {
  selectedTeams: 3,
  playerSelection: { mode: "observed" },
  maximumObservedPlayerCount: MAX_PLANNED_ROUND_PLAYER_COUNT,
  isPairingModeEnabled: false,
};

describe("allocationSessionReducer", () => {
  it("projects a single-round Session from its immutable Team count", () => {
    const state = createAllocationSessionState(observedConfiguration);

    expect(state).toMatchObject({
      declaredPlayerCount: null,
      multiRoundPlan: null,
    });
    expect(projectCurrentRound(state, 3)).toMatchObject({
      round: 0,
      isMultiRound: false,
      expectedTouchCount: 3,
      allowOverExpected: true,
      maximumTouchCount: MAX_PLANNED_ROUND_PLAYER_COUNT,
    });
  });

  it("projects Android observed Sessions with the twelve-contact capacity", () => {
    const state = createAllocationSessionState({
      ...observedConfiguration,
      maximumObservedPlayerCount: MAX_OBSERVED_PLAYER_COUNT,
    });

    expect(projectCurrentRound(state, 3)).toMatchObject({
      expectedTouchCount: 3,
      allowOverExpected: true,
      maximumTouchCount: MAX_OBSERVED_PLAYER_COUNT,
    });
  });

  for (const count of [6, 7, 8, 9, 10] as const) {
    it(`initializes an exact ${count}-Player Multi-Round Session`, () => {
      const state = createAllocationSessionState(
        createDeclaredConfiguration(count),
        () => 0.25,
      );

      expect(state.declaredPlayerCount).toBe(count);
      expect(state.multiRoundPlan?.roundOne).toHaveLength(5);
      expect(state.multiRoundPlan?.roundTwo).toHaveLength(count - 5);
      expect(projectCurrentRound(state, 4)).toMatchObject({
        firstRoundCount: 5,
        secondRoundCount: count - 5,
        expectedTouchCount: 5,
        allowOverExpected: false,
        maximumTouchCount: MAX_OBSERVED_PLAYER_COUNT,
      });
    });
  }

  it("makes duplicate reveal completion idempotent", () => {
    const state = allocationSessionReducer(createAllocationSessionState(), {
      type: "revealCompleted",
      round: 0,
      players: [revealedPlayer],
    });
    expect(
      allocationSessionReducer(state, {
        type: "revealCompleted",
        round: 0,
        players: [],
      }),
    ).toBe(state);
  });

  it("clamps Round settlement and ignores duplicate settled events", () => {
    const settled = allocationSessionReducer(createAllocationSessionState(), {
      type: "navigationSettled",
      round: 8,
    });
    const duplicate = allocationSessionReducer(settled, {
      type: "navigationSettled",
      round: 1,
    });

    expect(settled.currentRound).toBe(1);
    expect(settled.roundResetKey).toBe(1);
    expect(settled.navigationResetKey).toBe(0);
    expect(duplicate).toBe(settled);
  });

  it("records the swipe hint only once", () => {
    const seen = allocationSessionReducer(createAllocationSessionState(), {
      type: "swipeHintSeen",
    });
    expect(allocationSessionReducer(seen, { type: "swipeHintSeen" })).toBe(
      seen,
    );
  });

  it("resets the complete Session when exit finishes", () => {
    const configured = createAllocationSessionState(
      createDeclaredConfiguration(8),
      () => 0.25,
    );
    const revealed = allocationSessionReducer(configured, {
      type: "revealCompleted",
      round: 0,
      players: [revealedPlayer],
    });

    expect(
      allocationSessionReducer(revealed, { type: "exitCompleted" }),
    ).toEqual(createAllocationSessionState());
  });
});
