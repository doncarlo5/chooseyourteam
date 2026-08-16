import { describe, expect, it } from "vitest";
import {
  cancelControllerTouches,
  createControllerState,
  createRevealedPlayers,
  createTouchSnapshot,
  isPointInsideRect,
  meetsExpectedTouchCount,
  updateControllerTouch,
} from "./touch-allocation-controller";

describe("touch allocation controller", () => {
  it("allocates, moves, hides, and releases a touch slot", () => {
    const initialState = createControllerState(2);
    const downState = updateControllerTouch(initialState, {
      type: "down",
      touchId: 7,
      x: 10,
      y: 20,
    });
    const movedState = updateControllerTouch(downState, {
      type: "move",
      touchId: 7,
      x: 30,
      y: 40,
    });
    const ignoredState = updateControllerTouch(movedState, {
      type: "move",
      touchId: 7,
      x: 50,
      y: 60,
      isIgnored: true,
    });
    const upState = updateControllerTouch(ignoredState, {
      type: "up",
      touchId: 7,
      x: 50,
      y: 60,
    });

    expect(createTouchSnapshot(downState)).toEqual([
      { slotIndex: 0, touchId: 7, x: 10, y: 20 },
    ]);
    expect(createTouchSnapshot(movedState)[0]).toMatchObject({ x: 30, y: 40 });
    expect(createTouchSnapshot(ignoredState)).toEqual([]);
    expect(createTouchSnapshot(upState)).toEqual([]);
  });

  it("ignores control regions and refuses touches when slots are full", () => {
    const rect = { x: 5, y: 5, width: 20, height: 20, isReady: true };
    expect(isPointInsideRect(10, 10, rect)).toBe(true);
    expect(isPointInsideRect(30, 30, rect)).toBe(false);

    const state = updateControllerTouch(createControllerState(1), {
      type: "down",
      touchId: 1,
      x: 10,
      y: 10,
      isIgnored: true,
    });
    expect(state).toEqual(createControllerState(1));

    const occupied = updateControllerTouch(state, {
      type: "down",
      touchId: 1,
      x: 30,
      y: 30,
    });
    const full = updateControllerTouch(occupied, {
      type: "down",
      touchId: 2,
      x: 40,
      y: 40,
    });
    expect(full).toBe(occupied);
  });

  it("invalidates stale reveal tokens on changes, cancellation, and reset", () => {
    const active = updateControllerTouch(createControllerState(2), {
      type: "down",
      touchId: 1,
      x: 10,
      y: 20,
    });
    const cancelled = cancelControllerTouches(active);

    expect(active.revealToken).toBe(1);
    expect(cancelled.revealToken).toBe(2);
    expect(createTouchSnapshot(cancelled)).toEqual([]);
  });

  it("supports exact and at-least touch-count policies", () => {
    expect(meetsExpectedTouchCount(3, 3, false)).toBe(true);
    expect(meetsExpectedTouchCount(4, 3, false)).toBe(false);
    expect(meetsExpectedTouchCount(4, 3, true)).toBe(true);
    expect(meetsExpectedTouchCount(2, 3, true)).toBe(false);
  });

  it("uses a planned assignment and can deterministically finalize a flexible one", () => {
    const snapshot = [
      { slotIndex: 0, touchId: 10, x: 100, y: 200 },
      { slotIndex: 1, touchId: 11, x: 300, y: 400 },
    ];
    expect(
      createRevealedPlayers(snapshot, {
        selectedTeams: 2,
        roundAssignment: [2, 1],
        isPairingModeEnabled: false,
      }),
    ).toEqual([
      { x: 100, y: 200, team: 2 },
      { x: 300, y: 400, team: 1 },
    ]);

    const random = () => 0;
    expect(
      createRevealedPlayers(snapshot, {
        selectedTeams: 2,
        isPairingModeEnabled: false,
        random,
      }),
    ).toEqual(
      createRevealedPlayers(snapshot, {
        selectedTeams: 2,
        isPairingModeEnabled: false,
        random,
      }),
    );
  });
});
