import { describe, expect, it } from "vitest";
import {
  allocateTouchSlot,
  clearTouchSlots,
  countTrackedTouches,
  countVisibleTouches,
  createRevealedPlayers,
  createTouchSnapshot,
  findTouchSlot,
  invalidateToken,
  isCurrentToken,
  isExitReady,
  isPointInsideRect,
  meetsExpectedTouchCount,
  moveTouchSlot,
  releaseTouchSlot,
  type MutableCell,
  type TouchSlotStore,
} from "./touch-allocation-controller";

const createCell = <T>(initialValue: T): MutableCell<T> => {
  let value = initialValue;
  return {
    get: () => value,
    set: (nextValue) => {
      value = nextValue;
    },
  };
};

const createStore = (slotCount: number): TouchSlotStore => ({
  touchIds: Array.from({ length: slotCount }, () => createCell(-1)),
  active: Array.from({ length: slotCount }, () => createCell(0)),
  x: Array.from({ length: slotCount }, () => createCell(0)),
  y: Array.from({ length: slotCount }, () => createCell(0)),
});

describe("touch allocation controller", () => {
  it("allocates, moves, hides, and releases a touch slot", () => {
    const store = createStore(2);
    expect(allocateTouchSlot(store, 7, 10, 20)).toBe(0);
    expect(createTouchSnapshot(store)).toEqual([
      { slotIndex: 0, touchId: 7, x: 10, y: 20 },
    ]);
    expect(moveTouchSlot(store, 7, 30, 40, true)).toEqual({
      slotIndex: 0,
      visibilityChanged: false,
    });
    expect(createTouchSnapshot(store)[0]).toMatchObject({ x: 30, y: 40 });
    expect(moveTouchSlot(store, 7, 50, 60, false).visibilityChanged).toBe(true);
    expect(createTouchSnapshot(store)).toEqual([]);
    expect(countVisibleTouches(store)).toBe(0);
    expect(countTrackedTouches(store)).toBe(1);
    expect(releaseTouchSlot(store, 7)).toBe(0);
    expect(findTouchSlot(store, 7)).toBe(-1);
  });

  it("ignores control regions and refuses touches when slots are full", () => {
    const rect = { x: 5, y: 5, width: 20, height: 20, isReady: true };
    expect(isPointInsideRect(10, 10, rect)).toBe(true);
    expect(isPointInsideRect(30, 30, rect)).toBe(false);

    const store = createStore(1);
    expect(allocateTouchSlot(store, 1, 30, 30)).toBe(0);
    expect(allocateTouchSlot(store, 2, 40, 40)).toBe(-1);
    expect(countTrackedTouches(store)).toBe(1);
    expect(countVisibleTouches(store)).toBe(1);
  });

  it("invalidates stale reveal tokens on changes, cancellation, and reset", () => {
    const store = createStore(2);
    const token = createCell(0);
    allocateTouchSlot(store, 1, 10, 20);
    const countdownToken = invalidateToken(token);
    expect(isCurrentToken(token, countdownToken)).toBe(true);
    clearTouchSlots(store);
    invalidateToken(token);
    expect(isCurrentToken(token, countdownToken)).toBe(false);
    expect(createTouchSnapshot(store)).toEqual([]);
  });

  it("defers exit until every tracked touch is released or cancelled", () => {
    const store = createStore(2);
    allocateTouchSlot(store, 1, 10, 20);
    allocateTouchSlot(store, 2, 30, 40);

    expect(isExitReady(store, true)).toBe(false);
    releaseTouchSlot(store, 1);
    expect(isExitReady(store, true)).toBe(false);
    releaseTouchSlot(store, 2);
    expect(isExitReady(store, true)).toBe(true);
    expect(isExitReady(store, false)).toBe(false);
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
