import type { RevealedPlayer } from "@/src/domain/revealed-player";
import type { RoundAssignment, TeamNumber } from "@/src/domain/team-identity";
import type { TouchRect } from "@/src/helpers/types/home-screen";
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
  type TouchSlotStore,
  type TouchSnapshot,
} from "@/src/screens/touch-allocation-controller";
import { H } from "@/src/screens/utils/helper";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  makeMutable,
  SharedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import useTouchAllocationFeedback from "./use-touch-allocation-feedback";

const HIGHLIGHT_DELAY_MS = 3000;
const MAX_SLOTS = 12;
const SHAKE_DURATION_MS = 1600;
const PRE_REVEAL_SILENCE_MS = Math.max(
  0,
  HIGHLIGHT_DELAY_MS - SHAKE_DURATION_MS,
);

export type RevealedSlotAssignment = {
  slotIndex: number;
  team: TeamNumber;
};

export default function useTouchAllocationController(props: {
  selectedTeams: number;
  excludedRects: SharedValue<TouchRect>[];
  onReveal: (players: RevealedPlayer[]) => void;
  acceptsNewTouches: boolean;
  expectedTouchCount?: number;
  allowOverExpected?: boolean;
  roundAssignment?: RoundAssignment;
  isPairingModeEnabled?: boolean;
  resetKey?: number;
  exitRequested: boolean;
  onExitReady: () => void;
}): {
  touchGesture: ReturnType<typeof Gesture.Manual>;
  slotActive: SharedValue<number>[];
  slotX: SharedValue<number>[];
  slotY: SharedValue<number>[];
  slotOpacity: SharedValue<number>[];
  slotScale: SharedValue<number>[];
  slotRevealTeams: SharedValue<number>[];
  slotRevealProgress: SharedValue<number>[];
  revealedAssignments: RevealedSlotAssignment[];
  revealProgress: SharedValue<number>;
  shakeX: SharedValue<number>;
  isRevealed: boolean;
  isTouching: boolean;
  touchCount: number;
} {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [touchCount, setTouchCount] = useState(0);
  const [revealedAssignments, setRevealedAssignments] = useState<
    RevealedSlotAssignment[]
  >([]);
  const isRevealedSv = useSharedValue(0);
  const stableCountSv = useSharedValue(0);
  const countTokenSv = useSharedValue(0);
  const revealProgress = useSharedValue(0);
  const revealToken = useSharedValue(0);
  const exitPendingSv = useSharedValue(false);
  const shakeX = useSharedValue(0);
  const feedback = useTouchAllocationFeedback({ shakeX });
  const slotActive = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    [],
  );
  const slotX = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    [],
  );
  const slotY = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    [],
  );
  const slotOpacity = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    [],
  );
  const slotScale = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(1)),
    [],
  );
  const slotTouchId = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(-1)),
    [],
  );
  const slotRevealTeams = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    [],
  );
  const slotRevealProgress = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    [],
  );
  const slotStore = useMemo<TouchSlotStore>(
    () => ({
      touchIds: slotTouchId,
      active: slotActive,
      x: slotX,
      y: slotY,
    }),
    [slotActive, slotTouchId, slotX, slotY],
  );
  const isGestureEnabled = props.acceptsNewTouches;
  // Keep the native handler attached while Android is still tracking pointers.
  // Toggling Gesture.enabled mid-stream schedules an unsafe asynchronous cancel.
  const canAcceptNewTouches = useSharedValue(isGestureEnabled);

  const resetRevealState = () => {
    setIsRevealed(false);
    setRevealedAssignments([]);
    cancelAnimation(shakeX);
    shakeX.value = 0;
    feedback.clearPreRevealHaptics();
  };

  const resetAllSlotsJS = () => {
    resetRevealState();
    setIsTouching(false);
    setTouchCount(0);
  };

  const resetAllSlots = () => {
    resetAllSlotsJS();
    scheduleOnUI(hardResetSlotsWorklet);
  };

  const hardResetSlotsWorklet = () => {
    "worklet";

    cancelAnimation(revealProgress);
    revealProgress.value = 0;

    cancelAnimation(shakeX);
    shakeX.value = 0;

    invalidateToken(revealToken);
    invalidateToken(countTokenSv);
    isRevealedSv.set(0);
    stableCountSv.set(0);
    clearTouchSlots(slotStore);

    for (let i = 0; i < MAX_SLOTS; i += 1) {
      cancelAnimation(slotOpacity[i]);
      cancelAnimation(slotScale[i]);
      slotOpacity[i].value = 0;
      slotScale[i].value = 1;
      slotRevealTeams[i].set(0);
      slotRevealProgress[i].set(0);
    }
  };

  const handleCountChange = (count: number, token?: number) => {
    if (token !== undefined && !isCurrentToken(countTokenSv, token)) {
      return;
    }
    const expectedCount = props.expectedTouchCount ?? 2;
    const allowOverExpected = props.allowOverExpected ?? false;
    const meetsExpected = meetsExpectedTouchCount(
      count,
      expectedCount,
      allowOverExpected,
    );
    resetRevealState();
    setTouchCount(count);
    if (meetsExpected && count >= 1) {
      feedback.schedulePreRevealHaptics(
        HIGHLIGHT_DELAY_MS,
        PRE_REVEAL_SILENCE_MS,
      );
    }
  };

  const handleTrackedTouchChange = (count: number) => {
    setIsTouching(count > 0);
  };

  const finalizeReveal = (
    token: number,
    assignments: RevealedSlotAssignment[],
    players: RevealedPlayer[],
  ) => {
    if (!isCurrentToken(revealToken, token)) {
      return;
    }
    setRevealedAssignments(assignments);
    setIsRevealed(true);
    feedback.clearPreRevealHaptics();
    props.onReveal(players);
  };

  const applyRevealAssignments = (
    token: number,
    assignments: RevealedSlotAssignment[],
    players: RevealedPlayer[],
  ) => {
    "worklet";
    if (!isCurrentToken(revealToken, token)) {
      return;
    }
    cancelAnimation(shakeX);
    shakeX.set(withTiming(0, { duration: 120 }));
    for (let index = 0; index < MAX_SLOTS; index += 1) {
      slotRevealTeams[index].set(0);
      slotRevealProgress[index].set(0);
    }
    for (let index = 0; index < assignments.length; index += 1) {
      const assignment = assignments[index];
      slotRevealTeams[assignment.slotIndex].set(assignment.team);
      slotRevealProgress[assignment.slotIndex].set(
        withTiming(1, { duration: 200 }),
      );
    }
    scheduleOnRN(finalizeReveal, token, assignments, players);
  };

  const handleReveal = (token: number, snapshot: TouchSnapshot[]) => {
    if (!isCurrentToken(revealToken, token)) {
      return;
    }

    const players = createRevealedPlayers(snapshot, {
      selectedTeams: props.selectedTeams,
      roundAssignment: props.roundAssignment,
      isPairingModeEnabled: props.isPairingModeEnabled ?? false,
    });
    const assignments = snapshot.flatMap((touch, index) => {
      const player = players[index];
      return player ? [{ slotIndex: touch.slotIndex, team: player.team }] : [];
    });

    scheduleOnUI(applyRevealAssignments, token, assignments, players);
  };

  const isTouchIgnored = (x: number, y: number) => {
    "worklet";
    for (let index = 0; index < props.excludedRects.length; index += 1) {
      if (isPointInsideRect(x, y, props.excludedRects[index].get())) {
        return true;
      }
    }
    return false;
  };

  const startCountdown = (count: number) => {
    "worklet";
    cancelAnimation(revealProgress);
    revealProgress.value = 0;
    cancelAnimation(shakeX);
    shakeX.value = 0;
    const token = invalidateToken(revealToken);

    const expectedCount = props.expectedTouchCount ?? 2;
    const allowOverExpected = props.allowOverExpected ?? false;
    scheduleOnRN(handleCountChange, count, countTokenSv.get());
    const meetsExpected = meetsExpectedTouchCount(
      count,
      expectedCount,
      allowOverExpected,
    );
    if (count < 1 || !meetsExpected) {
      return;
    }

    revealProgress.value = withDelay(
      HIGHLIGHT_DELAY_MS,
      withTiming(1, { duration: 0 }, (finished) => {
        if (finished && isCurrentToken(revealToken, token)) {
          const snapshot = createTouchSnapshot(slotStore);
          isRevealedSv.set(1);
          scheduleOnRN(handleReveal, token, snapshot);
        }
      }),
    );
  };

  const updateStableCount = (count: number) => {
    "worklet";
    if (isRevealedSv.get() === 1) {
      return;
    }
    const expectedCount = props.expectedTouchCount ?? 2;
    const allowOverExpected = props.allowOverExpected ?? false;
    if (!allowOverExpected && count > expectedCount) {
      cancelAnimation(revealProgress);
      revealProgress.value = 0;

      cancelAnimation(shakeX);
      shakeX.value = 0;

      invalidateToken(revealToken);
      stableCountSv.set(count);
      const countToken = invalidateToken(countTokenSv);
      scheduleOnRN(handleCountChange, count, countToken);
      return;
    }
    if (count === stableCountSv.get()) {
      return;
    }
    stableCountSv.set(count);
    invalidateToken(countTokenSv);
    startCountdown(count);
  };
  const resetAllSlotsEvent = useEffectEvent(resetAllSlots);

  const notifyExitReady = () => {
    props.onExitReady();
  };

  const completeExitIfReady = () => {
    "worklet";
    if (isExitReady(slotStore, exitPendingSv.get())) {
      exitPendingSv.set(false);
      scheduleOnRN(notifyExitReady);
    }
  };

  const requestExit = () => {
    "worklet";
    canAcceptNewTouches.set(false);
    exitPendingSv.set(true);
    completeExitIfReady();
  };

  const resetIfNoTrackedTouches = () => {
    "worklet";
    if (countTrackedTouches(slotStore) === 0) {
      hardResetSlotsWorklet();
      scheduleOnRN(resetAllSlotsJS);
    }
  };
  const resetIfNoTrackedTouchesEvent = useEffectEvent(() => {
    scheduleOnUI(resetIfNoTrackedTouches);
  });
  const requestExitEvent = useEffectEvent(() => {
    scheduleOnUI(requestExit);
  });

  useEffect(() => {
    resetAllSlotsEvent();
  }, [props.selectedTeams]);

  useEffect(() => {
    if (props.resetKey !== undefined) {
      resetAllSlotsEvent();
    }
  }, [props.resetKey]);

  useEffect(() => {
    if (!props.acceptsNewTouches) {
      resetIfNoTrackedTouchesEvent();
    }
  }, [props.acceptsNewTouches]);

  useEffect(() => {
    canAcceptNewTouches.set(isGestureEnabled && !props.exitRequested);
  }, [canAcceptNewTouches, isGestureEnabled, props.exitRequested]);

  useEffect(() => {
    if (props.exitRequested) {
      requestExitEvent();
    }
  }, [props.exitRequested]);

  const touchGesture = Gesture.Manual()
    .onTouchesDown((event) => {
      "worklet";

      if (!canAcceptNewTouches.get()) {
        return;
      }

      for (const touch of event.changedTouches) {
        const x = touch.absoluteX;
        const y = touch.absoluteY;
        const ignored = isTouchIgnored(x, y);
        if (isRevealedSv.get() === 1) {
          const slot = findTouchSlot(slotStore, touch.id);
          if (slot !== -1) {
            slotX[slot].set(x);
            slotY[slot].set(y);
          }
          continue;
        }
        if (ignored) {
          continue;
        }
        let slot = findTouchSlot(slotStore, touch.id);
        if (slot === -1) {
          slot = allocateTouchSlot(slotStore, touch.id, x, y);
          if (slot !== -1) {
            slotOpacity[slot].value = 0;
            slotScale[slot].value = 0.7;
            slotOpacity[slot].value = withTiming(1, { duration: 120 });
            slotScale[slot].value = withSpring(1, {
              damping: 40,
              stiffness: 5000,
            });
            scheduleOnRN(H.touchDown);
            scheduleOnRN(feedback.playBubble, slot);
          }
        }
        if (slot !== -1) {
          moveTouchSlot(slotStore, touch.id, x, y, !ignored);
        }
      }

      const afterCount = countVisibleTouches(slotStore);

      scheduleOnRN(handleTrackedTouchChange, countTrackedTouches(slotStore));
      updateStableCount(afterCount);
    })
    .onTouchesMove((event) => {
      "worklet";
      let visibilityChanged = false;
      for (const touch of event.changedTouches) {
        const slot = findTouchSlot(slotStore, touch.id);
        if (slot === -1) {
          continue;
        }
        const x = touch.absoluteX;
        const y = touch.absoluteY;
        slotX[slot].set(x);
        slotY[slot].set(y);
        if (isRevealedSv.get() === 0) {
          const ignored = isTouchIgnored(x, y);
          const result = moveTouchSlot(slotStore, touch.id, x, y, !ignored);
          visibilityChanged ||= result.visibilityChanged;
        }
      }
      if (visibilityChanged) {
        updateStableCount(countVisibleTouches(slotStore));
      }
    })
    .onTouchesUp((event, stateManager) => {
      "worklet";

      // Always process cleanup; if disabled mid-gesture, we still must clear visuals.
      for (const touch of event.changedTouches) {
        const slot = releaseTouchSlot(slotStore, touch.id);
        if (slot === -1) continue;

        slotOpacity[slot].value = withTiming(0, { duration: 140 }, (done) => {
          if (done && slotTouchId[slot].get() === -1) {
            slotActive[slot].value = 0;
            slotScale[slot].value = 1;
          }
        });
      }

      const isStillDown = (id: number) => {
        "worklet";
        for (let i = 0; i < event.allTouches.length; i += 1) {
          if (event.allTouches[i].id === id) return true;
        }
        return false;
      };

      for (let i = 0; i < MAX_SLOTS; i += 1) {
        const id = slotTouchId[i].get();
        if (id !== -1 && !isStillDown(id)) {
          slotTouchId[i].set(-1);
          slotActive[i].value = 0;
          slotOpacity[i].value = 0;
          slotScale[i].value = 1;
        }
      }

      const remainingVisible = countVisibleTouches(slotStore);
      const remainingTracked = countTrackedTouches(slotStore);
      scheduleOnRN(handleTrackedTouchChange, remainingTracked);

      // If there are no more touches, do an immediate UI-thread reset.
      if (remainingTracked === 0) {
        hardResetSlotsWorklet(); // ✅ synchronous UI-thread clear
        scheduleOnRN(resetAllSlotsJS); // ✅ JS state/timers cleanup
        completeExitIfReady();
        stateManager.end();
        return;
      }

      // Otherwise continue normal logic.
      updateStableCount(remainingVisible);
    })

    .onTouchesCancelled((event, stateManager) => {
      "worklet";

      const reachedIosTouchLimit =
        Platform.OS === "ios" &&
        (props.allowOverExpected ?? false) &&
        isRevealedSv.get() === 0 &&
        countVisibleTouches(slotStore) === 5;

      if (reachedIosTouchLimit) {
        scheduleOnRN(feedback.showIosTouchLimitToast);
      }

      hardResetSlotsWorklet();
      scheduleOnRN(resetAllSlotsJS);
      completeExitIfReady();
      stateManager.end();
    });

  return {
    touchGesture,
    slotActive,
    slotX,
    slotY,
    slotOpacity,
    slotScale,
    slotRevealTeams,
    slotRevealProgress,
    revealedAssignments,
    revealProgress,
    shakeX,
    isRevealed,
    isTouching,
    touchCount,
  };
}
