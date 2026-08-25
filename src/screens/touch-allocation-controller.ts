import {
  planBalancedRoundAssignment,
  type RandomSource,
} from "../domain/team-allocation";
import type { RevealedPlayer } from "../domain/revealed-player";
import type { RoundAssignment } from "../domain/team-identity";
import type { TouchRect } from "../helpers/types/home-screen";

export type TouchSnapshot = {
  slotIndex: number;
  touchId: number;
  x: number;
  y: number;
};

export type MutableCell<T> = {
  get: () => T;
  set: (value: T) => void;
};

export type TouchSlotStore = {
  touchIds: MutableCell<number>[];
  active: MutableCell<number>[];
  x: MutableCell<number>[];
  y: MutableCell<number>[];
};

export type TouchAllocationLifecycleStore = TouchSlotStore & {
  stableCount: MutableCell<number>;
  countdownToken: MutableCell<number>;
  isRevealed: MutableCell<boolean>;
  exitPending: MutableCell<boolean>;
};

export type TouchAllocationLifecycleConfiguration = {
  expectedTouchCount: number;
  allowOverExpected: boolean;
  maximumTouchCount: number;
};

export type TouchAllocationLifecycleEvent =
  | {
      type: "admit";
      touchId: number;
      x: number;
      y: number;
      isIgnored: boolean;
      acceptsNewTouches: boolean;
    }
  | {
      type: "move";
      touchId: number;
      x: number;
      y: number;
      isIgnored: boolean;
    }
  | { type: "release"; touchId: number }
  | { type: "cancel" }
  | { type: "reset" }
  | { type: "requestExit" }
  | { type: "synchronize" }
  | { type: "countdownCompleted"; token: number };

export type TouchAllocationLifecycleResult = {
  slotIndex: number;
  wasAllocated: boolean;
  capacityExceeded: boolean;
  visibilityChanged: boolean;
  visibleCount: number;
  trackedCount: number;
  countChanged: boolean;
  countdownToken: number | null;
  snapshot: TouchSnapshot[] | null;
  exitReady: boolean;
};

export type TouchAllocationLifecycleEffect =
  | {
      type: "touchCountChanged";
      count: number;
      countdownToken: number | null;
    }
  | { type: "revealReady"; snapshot: TouchSnapshot[] }
  | { type: "touchCapacityExceeded" }
  | { type: "exitReady" };

export const isPointInsideRect = (x: number, y: number, rect: TouchRect) => {
  "worklet";
  return (
    rect.isReady &&
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
};

export const findTouchSlot = (store: TouchSlotStore, touchId: number) => {
  "worklet";
  for (let index = 0; index < store.touchIds.length; index += 1) {
    if (store.touchIds[index].get() === touchId) {
      return index;
    }
  }
  return -1;
};

export const allocateTouchSlot = (
  store: TouchSlotStore,
  touchId: number,
  x: number,
  y: number,
) => {
  "worklet";
  const existingSlot = findTouchSlot(store, touchId);
  if (existingSlot !== -1) {
    return existingSlot;
  }
  for (let index = 0; index < store.touchIds.length; index += 1) {
    if (store.touchIds[index].get() !== -1) {
      continue;
    }
    store.touchIds[index].set(touchId);
    store.active[index].set(1);
    store.x[index].set(x);
    store.y[index].set(y);
    return index;
  }
  return -1;
};

export const moveTouchSlot = (
  store: TouchSlotStore,
  touchId: number,
  x: number,
  y: number,
  isActive: boolean,
) => {
  "worklet";
  const slotIndex = findTouchSlot(store, touchId);
  if (slotIndex === -1) {
    return { slotIndex, visibilityChanged: false };
  }
  const nextActive = isActive ? 1 : 0;
  const visibilityChanged = store.active[slotIndex].get() !== nextActive;
  store.x[slotIndex].set(x);
  store.y[slotIndex].set(y);
  store.active[slotIndex].set(nextActive);
  return { slotIndex, visibilityChanged };
};

export const releaseTouchSlot = (store: TouchSlotStore, touchId: number) => {
  "worklet";
  const slotIndex = findTouchSlot(store, touchId);
  if (slotIndex !== -1) {
    store.touchIds[slotIndex].set(-1);
  }
  return slotIndex;
};

export const clearTouchSlots = (store: TouchSlotStore) => {
  "worklet";
  for (let index = 0; index < store.touchIds.length; index += 1) {
    store.touchIds[index].set(-1);
    store.active[index].set(0);
  }
};

export const countVisibleTouches = (store: TouchSlotStore) => {
  "worklet";
  let count = 0;
  for (let index = 0; index < store.touchIds.length; index += 1) {
    if (store.active[index].get() === 1 && store.touchIds[index].get() !== -1) {
      count += 1;
    }
  }
  return count;
};

export const countTrackedTouches = (store: TouchSlotStore) => {
  "worklet";
  let count = 0;
  for (let index = 0; index < store.touchIds.length; index += 1) {
    if (store.touchIds[index].get() !== -1) {
      count += 1;
    }
  }
  return count;
};

export const isExitReady = (store: TouchSlotStore, isExitPending: boolean) => {
  "worklet";
  return isExitPending && countTrackedTouches(store) === 0;
};

export const createTouchSnapshot = (store: TouchSlotStore): TouchSnapshot[] => {
  "worklet";
  const snapshot: TouchSnapshot[] = [];
  for (let slotIndex = 0; slotIndex < store.touchIds.length; slotIndex += 1) {
    const touchId = store.touchIds[slotIndex].get();
    if (store.active[slotIndex].get() === 1 && touchId !== -1) {
      snapshot.push({
        slotIndex,
        touchId,
        x: store.x[slotIndex].get(),
        y: store.y[slotIndex].get(),
      });
    }
  }
  return snapshot;
};

export const invalidateToken = (token: MutableCell<number>) => {
  "worklet";
  const nextToken = token.get() + 1;
  token.set(nextToken);
  return nextToken;
};

export const isCurrentToken = (
  token: MutableCell<number>,
  candidate: number,
) => {
  "worklet";
  return token.get() === candidate;
};

export const meetsExpectedTouchCount = (
  count: number,
  expectedCount: number,
  allowOverExpected: boolean,
) => {
  "worklet";
  return allowOverExpected ? count >= expectedCount : count === expectedCount;
};

const createLifecycleResult = (
  store: TouchAllocationLifecycleStore,
): TouchAllocationLifecycleResult => {
  "worklet";
  return {
    slotIndex: -1,
    wasAllocated: false,
    capacityExceeded: false,
    visibilityChanged: false,
    visibleCount: countVisibleTouches(store),
    trackedCount: countTrackedTouches(store),
    countChanged: false,
    countdownToken: null,
    snapshot: null,
    exitReady: false,
  };
};

const updateLifecycleCount = (
  store: TouchAllocationLifecycleStore,
  configuration: TouchAllocationLifecycleConfiguration,
  result: TouchAllocationLifecycleResult,
) => {
  "worklet";
  if (
    store.isRevealed.get() ||
    result.visibleCount === store.stableCount.get()
  ) {
    return;
  }

  store.stableCount.set(result.visibleCount);
  result.countChanged = true;
  result.countdownToken = invalidateToken(store.countdownToken);
  if (
    result.visibleCount < 1 ||
    !meetsExpectedTouchCount(
      result.visibleCount,
      configuration.expectedTouchCount,
      configuration.allowOverExpected,
    )
  ) {
    result.countdownToken = null;
  }
};

/**
 * This is the internal effect seam shared by the production UI-thread adapter
 * and deterministic tests. The transition owns decisions; adapters own timing,
 * animation, feedback, and thread crossings.
 */
export const getTouchAllocationLifecycleEffects = (
  result: TouchAllocationLifecycleResult,
) => {
  "worklet";
  const effects: TouchAllocationLifecycleEffect[] = [];
  if (result.countChanged) {
    effects.push({
      type: "touchCountChanged",
      count: result.visibleCount,
      countdownToken: result.countdownToken,
    });
  }
  if (result.snapshot) {
    effects.push({ type: "revealReady", snapshot: result.snapshot });
  }
  if (result.capacityExceeded) {
    effects.push({ type: "touchCapacityExceeded" });
  }
  if (result.exitReady) {
    effects.push({ type: "exitReady" });
  }
  return effects;
};

/**
 * The production Gesture Handler adapter and deterministic tests both cross
 * this seam. It owns pointer identity, visibility/count policy, countdown
 * validity, snapshot creation, cancellation/reset, and deferred exit.
 */
export const transitionTouchAllocationLifecycle = (
  store: TouchAllocationLifecycleStore,
  configuration: TouchAllocationLifecycleConfiguration,
  event: TouchAllocationLifecycleEvent,
): TouchAllocationLifecycleResult => {
  "worklet";
  const result = createLifecycleResult(store);

  if (event.type === "reset" || event.type === "cancel") {
    clearTouchSlots(store);
    store.stableCount.set(0);
    store.isRevealed.set(false);
    invalidateToken(store.countdownToken);
    result.visibleCount = 0;
    result.trackedCount = 0;
    result.countChanged = true;
    result.exitReady = store.exitPending.get();
    if (result.exitReady) {
      store.exitPending.set(false);
    }
    return result;
  }

  if (event.type === "requestExit") {
    store.exitPending.set(true);
    result.exitReady = countTrackedTouches(store) === 0;
    if (result.exitReady) {
      store.exitPending.set(false);
    }
    return result;
  }

  if (event.type === "countdownCompleted") {
    if (
      !isCurrentToken(store.countdownToken, event.token) ||
      store.isRevealed.get()
    ) {
      return result;
    }
    const snapshot = createTouchSnapshot(store);
    if (
      !meetsExpectedTouchCount(
        snapshot.length,
        configuration.expectedTouchCount,
        configuration.allowOverExpected,
      )
    ) {
      return result;
    }
    store.isRevealed.set(true);
    result.snapshot = snapshot;
    return result;
  }

  // A reveal freezes Player positions, but pointer ownership must remain intact
  // until native up/cancel cleanup completes (see the Android lifecycle ADR).
  if (
    store.isRevealed.get() &&
    (event.type === "admit" || event.type === "move")
  ) {
    return result;
  }

  if (event.type === "admit") {
    if (!event.acceptsNewTouches || event.isIgnored) {
      return result;
    }
    const existingSlot = findTouchSlot(store, event.touchId);
    if (
      existingSlot === -1 &&
      countTrackedTouches(store) >= configuration.maximumTouchCount
    ) {
      result.capacityExceeded = true;
      return result;
    }
    result.slotIndex = allocateTouchSlot(
      store,
      event.touchId,
      event.x,
      event.y,
    );
    result.wasAllocated = existingSlot === -1 && result.slotIndex !== -1;
    result.capacityExceeded = existingSlot === -1 && result.slotIndex === -1;
    if (result.slotIndex !== -1) {
      moveTouchSlot(store, event.touchId, event.x, event.y, true);
    }
  }

  if (event.type === "move") {
    const moved = moveTouchSlot(
      store,
      event.touchId,
      event.x,
      event.y,
      !event.isIgnored,
    );
    result.slotIndex = moved.slotIndex;
    result.visibilityChanged = moved.visibilityChanged;
  }

  if (event.type === "release") {
    result.slotIndex = releaseTouchSlot(store, event.touchId);
  }

  result.visibleCount = countVisibleTouches(store);
  result.trackedCount = countTrackedTouches(store);
  updateLifecycleCount(store, configuration, result);
  if (store.exitPending.get() && result.trackedCount === 0) {
    store.exitPending.set(false);
    result.exitReady = true;
  }
  return result;
};

export const createRevealedPlayers = (
  snapshot: TouchSnapshot[],
  options: {
    selectedTeams: number;
    roundAssignment?: RoundAssignment;
    isPairingModeEnabled: boolean;
    random?: RandomSource;
  },
): RevealedPlayer[] => {
  const assignment =
    options.roundAssignment?.length === snapshot.length
      ? options.roundAssignment
      : planBalancedRoundAssignment(
          options.selectedTeams,
          snapshot.length,
          options.random,
          { pairingMode: options.isPairingModeEnabled },
        );

  return snapshot.map((touch, index) => ({
    x: touch.x,
    y: touch.y,
    team: assignment[index],
  }));
};
