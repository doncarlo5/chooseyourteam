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
