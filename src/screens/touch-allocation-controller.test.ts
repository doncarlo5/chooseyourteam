import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRevealedPlayers,
  getTouchAllocationLifecycleEffects,
  isPointInsideRect,
  transitionTouchAllocationLifecycle,
  type MutableCell,
  type TouchAllocationLifecycleConfiguration,
  type TouchAllocationLifecycleEffect,
  type TouchAllocationLifecycleEvent,
  type TouchAllocationLifecycleStore,
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

const createLifecycle = (slotCount = 12): TouchAllocationLifecycleStore => ({
  touchIds: Array.from({ length: slotCount }, () => createCell(-1)),
  active: Array.from({ length: slotCount }, () => createCell(0)),
  x: Array.from({ length: slotCount }, () => createCell(0)),
  y: Array.from({ length: slotCount }, () => createCell(0)),
  stableCount: createCell(0),
  countdownToken: createCell(0),
  isRevealed: createCell(0),
  exitPending: createCell(false),
});

const exactTwo: TouchAllocationLifecycleConfiguration = {
  expectedTouchCount: 2,
  allowOverExpected: false,
};

const admit = (
  store: TouchAllocationLifecycleStore,
  touchId: number,
  configuration = exactTwo,
) =>
  transitionTouchAllocationLifecycle(store, configuration, {
    type: "admit",
    touchId,
    x: touchId * 10,
    y: touchId * 20,
    isIgnored: false,
    acceptsNewTouches: true,
  });

const createDeterministicLifecycleHarness = (
  configuration: TouchAllocationLifecycleConfiguration,
) => {
  const store = createLifecycle();
  const feedback: TouchAllocationLifecycleEffect[] = [];
  let countdownHandle: ReturnType<typeof setTimeout> | null = null;
  const dispatch = (event: TouchAllocationLifecycleEvent) => {
    const result = transitionTouchAllocationLifecycle(
      store,
      configuration,
      event,
    );
    for (const effect of getTouchAllocationLifecycleEffects(result)) {
      feedback.push(effect);
      if (effect.type !== "touchCountChanged") {
        continue;
      }
      if (countdownHandle !== null) {
        clearTimeout(countdownHandle);
        countdownHandle = null;
      }
      if (effect.countdownToken !== null) {
        countdownHandle = setTimeout(() => {
          dispatch({
            type: "countdownCompleted",
            token: effect.countdownToken!,
          });
        }, 3000);
      }
    }
    return result;
  };
  const admitTouch = (touchId: number) =>
    dispatch({
      type: "admit",
      touchId,
      x: touchId * 10,
      y: touchId * 20,
      isIgnored: false,
      acceptsNewTouches: true,
    });

  return { store, feedback, dispatch, admitTouch };
};

describe("touch allocation lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("owns admission, stable slot identity, and slot exhaustion", () => {
    const store = createLifecycle(2);
    expect(admit(store, 1).wasAllocated).toBe(true);
    expect(admit(store, 1).wasAllocated).toBe(false);
    expect(admit(store, 2).slotIndex).toBe(1);
    expect(admit(store, 3).slotIndex).toBe(-1);
  });

  it("ignores excluded/control touches and disabled admission", () => {
    const store = createLifecycle(1);
    const rect = { x: 5, y: 5, width: 20, height: 20, isReady: true };
    expect(isPointInsideRect(10, 10, rect)).toBe(true);
    expect(
      transitionTouchAllocationLifecycle(store, exactTwo, {
        type: "admit",
        touchId: 1,
        x: 10,
        y: 10,
        isIgnored: true,
        acceptsNewTouches: true,
      }).trackedCount,
    ).toBe(0);
    expect(
      transitionTouchAllocationLifecycle(store, exactTwo, {
        type: "admit",
        touchId: 2,
        x: 40,
        y: 40,
        isIgnored: false,
        acceptsNewTouches: false,
      }).trackedCount,
    ).toBe(0);
  });

  it("tracks movement visibility separately from native pointer ownership", () => {
    const store = createLifecycle();
    admit(store, 1);
    const hidden = transitionTouchAllocationLifecycle(store, exactTwo, {
      type: "move",
      touchId: 1,
      x: 80,
      y: 90,
      isIgnored: true,
    });
    expect(hidden).toMatchObject({
      visibilityChanged: true,
      visibleCount: 0,
      trackedCount: 1,
    });
    const visible = transitionTouchAllocationLifecycle(store, exactTwo, {
      type: "move",
      touchId: 1,
      x: 90,
      y: 100,
      isIgnored: false,
    });
    expect(visible).toMatchObject({ visibilityChanged: true, visibleCount: 1 });
  });

  it("drives countdown invalidation and restart through the production effect seam", () => {
    const harness = createDeterministicLifecycleHarness(exactTwo);
    expect(harness.admitTouch(1).countdownToken).toBeNull();
    const started = harness.admitTouch(2);
    expect(started.countdownToken).toBe(2);
    const invalidated = harness.admitTouch(3);
    expect(invalidated.countdownToken).toBeNull();
    vi.advanceTimersByTime(3000);
    expect(
      harness.feedback.some((effect) => effect.type === "revealReady"),
    ).toBe(false);
    const restarted = harness.dispatch({
      type: "release",
      touchId: 3,
    });
    expect(restarted.countdownToken).toBe(4);
    vi.advanceTimersByTime(2999);
    expect(
      harness.feedback.some((effect) => effect.type === "revealReady"),
    ).toBe(false);
    vi.advanceTimersByTime(1);
    expect(
      harness.feedback.filter((effect) => effect.type === "revealReady"),
    ).toHaveLength(1);
  });

  it("allows over-count in flexible mode and creates one ordered snapshot", () => {
    const store = createLifecycle();
    const flexible = { expectedTouchCount: 2, allowOverExpected: true };
    admit(store, 1, flexible);
    admit(store, 2, flexible);
    const third = admit(store, 3, flexible);
    const completed = transitionTouchAllocationLifecycle(store, flexible, {
      type: "countdownCompleted",
      token: third.countdownToken!,
    });
    expect(completed.snapshot).toEqual([
      { slotIndex: 0, touchId: 1, x: 10, y: 20 },
      { slotIndex: 1, touchId: 2, x: 20, y: 40 },
      { slotIndex: 2, touchId: 3, x: 30, y: 60 },
    ]);
    expect(
      transitionTouchAllocationLifecycle(store, flexible, {
        type: "countdownCompleted",
        token: third.countdownToken!,
      }).snapshot,
    ).toBeNull();
  });

  it("resets and cancels countdown state", () => {
    const store = createLifecycle();
    admit(store, 1);
    admit(store, 2);
    const token = store.countdownToken.get();
    const reset = transitionTouchAllocationLifecycle(store, exactTwo, {
      type: "reset",
    });
    expect(reset).toMatchObject({ visibleCount: 0, trackedCount: 0 });
    expect(store.countdownToken.get()).not.toBe(token);
  });

  it("defers exit through three-plus-pointer release ordering", () => {
    const store = createLifecycle(4);
    [1, 2, 3, 4].forEach((touchId) => admit(store, touchId));
    expect(
      transitionTouchAllocationLifecycle(store, exactTwo, {
        type: "requestExit",
      }).exitReady,
    ).toBe(false);
    [3, 1, 4].forEach((touchId) => {
      expect(
        transitionTouchAllocationLifecycle(store, exactTwo, {
          type: "release",
          touchId,
        }).exitReady,
      ).toBe(false);
    });
    expect(
      transitionTouchAllocationLifecycle(store, exactTwo, {
        type: "release",
        touchId: 2,
      }).exitReady,
    ).toBe(true);
  });

  it("reconciles pointers omitted from a native changed-touch batch", () => {
    const store = createLifecycle(4);
    [1, 2, 3].forEach((touchId) => admit(store, touchId));
    store.touchIds[2].set(-1);
    store.active[2].set(0);

    const synchronized = transitionTouchAllocationLifecycle(store, exactTwo, {
      type: "synchronize",
    });
    expect(synchronized).toMatchObject({
      visibleCount: 2,
      trackedCount: 2,
      countChanged: true,
    });
    expect(synchronized.countdownToken).not.toBeNull();
  });

  it("completes a pending exit on cancellation", () => {
    const store = createLifecycle();
    admit(store, 1);
    transitionTouchAllocationLifecycle(store, exactTwo, {
      type: "requestExit",
    });
    expect(
      transitionTouchAllocationLifecycle(store, exactTwo, {
        type: "cancel",
      }).exitReady,
    ).toBe(true);
  });

  it("uses planned assignment and deterministic flexible allocation", () => {
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
