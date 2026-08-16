import type { MultiRoundAssignmentPlan } from "@/src/domain/team-allocation";
import type { RevealedPlayer } from "@/src/domain/revealed-player";
import { describe, expect, it } from "vitest";
import {
  allocationSessionReducer,
  createAllocationSessionState,
  projectCurrentRound,
} from "./allocation-session-state";

const revealedPlayer: RevealedPlayer = { x: 100, y: 200, team: 1 };
const multiRoundPlan: MultiRoundAssignmentPlan = {
  roundOne: [1, 2, 3, 4, 1],
  roundTwo: [2, 3, 4],
};

describe("allocationSessionReducer", () => {
  it("projects a single-round Session from its immutable Team count", () => {
    expect(
      projectCurrentRound(createAllocationSessionState(), 3),
    ).toMatchObject({
      round: 0,
      isMultiRound: false,
      expectedTouchCount: 3,
      allowOverExpected: true,
    });
  });

  it("stores an injected Multi-Round plan and resets prior Round state", () => {
    const revealed = allocationSessionReducer(createAllocationSessionState(), {
      type: "revealCompleted",
      round: 0,
      players: [revealedPlayer],
    });
    const state = allocationSessionReducer(revealed, {
      type: "selectPlayerCount",
      playerCount: 8,
      plan: multiRoundPlan,
    });

    expect(state.multiRoundPlan).toBe(multiRoundPlan);
    expect(state.roundOneSnapshot).toEqual([]);
    expect(state.roundResetKey).toBe(1);
    expect(state.navigationResetKey).toBe(1);
    expect(projectCurrentRound(state, 4)).toMatchObject({
      firstRoundCount: 5,
      secondRoundCount: 3,
      expectedTouchCount: 5,
      allowOverExpected: false,
    });
  });

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
    const selected = allocationSessionReducer(createAllocationSessionState(), {
      type: "selectPlayerCount",
      playerCount: 8,
      plan: multiRoundPlan,
    });
    const revealed = allocationSessionReducer(selected, {
      type: "revealCompleted",
      round: 0,
      players: [revealedPlayer],
    });

    expect(
      allocationSessionReducer(revealed, { type: "exitCompleted" }),
    ).toEqual(createAllocationSessionState());
  });
});
