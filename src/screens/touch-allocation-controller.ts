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

export type ControllerSlot = {
  touchId: number | null;
  x: number;
  y: number;
  isActive: boolean;
};

export type ControllerState = {
  slots: ControllerSlot[];
  revealToken: number;
};

export const createControllerState = (slotCount: number): ControllerState => ({
  slots: Array.from({ length: slotCount }, () => ({
    touchId: null,
    x: 0,
    y: 0,
    isActive: false,
  })),
  revealToken: 0,
});

export const isPointInsideRect = (x: number, y: number, rect: TouchRect) =>
  rect.isReady &&
  x >= rect.x &&
  x <= rect.x + rect.width &&
  y >= rect.y &&
  y <= rect.y + rect.height;

export const updateControllerTouch = (
  state: ControllerState,
  event: {
    type: "down" | "move" | "up";
    touchId: number;
    x: number;
    y: number;
    isIgnored?: boolean;
  },
): ControllerState => {
  const slots = state.slots.map((slot) => ({ ...slot }));
  let slotIndex = slots.findIndex((slot) => slot.touchId === event.touchId);

  if (event.type === "down" && slotIndex === -1 && !event.isIgnored) {
    slotIndex = slots.findIndex((slot) => slot.touchId === null);
    if (slotIndex !== -1) {
      slots[slotIndex] = {
        touchId: event.touchId,
        x: event.x,
        y: event.y,
        isActive: true,
      };
    }
  }

  if (slotIndex === -1) {
    return state;
  }

  if (event.type === "up") {
    slots[slotIndex] = {
      touchId: null,
      x: event.x,
      y: event.y,
      isActive: false,
    };
  } else {
    slots[slotIndex] = {
      ...slots[slotIndex],
      x: event.x,
      y: event.y,
      isActive: !event.isIgnored,
    };
  }

  return { slots, revealToken: state.revealToken + 1 };
};

export const cancelControllerTouches = (
  state: ControllerState,
): ControllerState => ({
  ...createControllerState(state.slots.length),
  revealToken: state.revealToken + 1,
});

export const createTouchSnapshot = (state: ControllerState): TouchSnapshot[] =>
  state.slots.flatMap((slot, slotIndex) =>
    slot.isActive && slot.touchId !== null
      ? [
          {
            slotIndex,
            touchId: slot.touchId,
            x: slot.x,
            y: slot.y,
          },
        ]
      : [],
  );

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
