import type { RevealedPlayer } from "@/src/domain/revealed-player";
import { MAX_OBSERVED_PLAYER_COUNT } from "@/src/domain/team-allocation";
import type { RoundAssignment, TeamNumber } from "@/src/domain/team-identity";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import {
  countTrackedTouches,
  countVisibleTouches,
  createRevealedPlayers,
  getTouchAllocationLifecycleEffects,
  findTouchSlot,
  isCurrentToken,
  isExitReady,
  isPointInsideRect,
  meetsExpectedTouchCount,
  transitionTouchAllocationLifecycle,
  type TouchAllocationLifecycleResult,
  type TouchAllocationLifecycleStore,
  type TouchSlotStore,
  type TouchSnapshot,
} from "@/src/screens/touch-allocation-controller";
import { H } from "@/src/screens/utils/helper";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { Platform } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  SharedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import useSlotSharedValues from "./use-slot-shared-values";
import useTouchAllocationFeedback from "./use-touch-allocation-feedback";

const HIGHLIGHT_DELAY_MS = 3000;
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
  isRoundNavigationIdle: SharedValue<boolean>;
  expectedTouchCount?: number;
  allowOverExpected?: boolean;
  maximumTouchCount: number;
  roundAssignment?: RoundAssignment;
  isPairingModeEnabled?: boolean;
  resetKey?: number;
  exitRequested: boolean;
  onExitReady: () => void;
  onSelectSixPlayers?: () => void;
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
  const isRevealedSv = useSharedValue(false);
  const stableCountSv = useSharedValue(0);
  const revealProgress = useSharedValue(0);
  const revealToken = useSharedValue(0);
  const exitPendingSv = useSharedValue(false);
  const shakeX = useSharedValue(0);
  const feedback = useTouchAllocationFeedback({
    shakeX,
    onSelectSixPlayers: props.onSelectSixPlayers,
  });
  const slotActive = useSlotSharedValues(0);
  const slotX = useSlotSharedValues(0);
  const slotY = useSlotSharedValues(0);
  const slotOpacity = useSlotSharedValues(0);
  const slotScale = useSlotSharedValues(1);
  const slotTouchId = useSlotSharedValues(-1);
  const slotRevealTeams = useSlotSharedValues(0);
  const slotRevealProgress = useSlotSharedValues(0);
  const slotStore = useMemo<TouchSlotStore>(
    () => ({
      touchIds: slotTouchId,
      active: slotActive,
      x: slotX,
      y: slotY,
    }),
    [slotActive, slotTouchId, slotX, slotY],
  );
  const lifecycleStore = useMemo<TouchAllocationLifecycleStore>(
    () => ({
      ...slotStore,
      stableCount: stableCountSv,
      countdownToken: revealToken,
      isRevealed: isRevealedSv,
      exitPending: exitPendingSv,
    }),
    [exitPendingSv, isRevealedSv, revealToken, slotStore, stableCountSv],
  );
  const lifecycleConfiguration = useMemo(
    () => ({
      expectedTouchCount: props.expectedTouchCount ?? 2,
      allowOverExpected: props.allowOverExpected ?? false,
      maximumTouchCount: props.maximumTouchCount,
    }),
    [
      props.allowOverExpected,
      props.expectedTouchCount,
      props.maximumTouchCount,
    ],
  );
  const isGestureEnabled = props.acceptsNewTouches;
  // Keep the native handler attached while Android is still tracking pointers.
  // Toggling Gesture.enabled mid-stream schedules an unsafe asynchronous cancel.
  const canAcceptNewTouches = useSharedValue(isGestureEnabled);

  const resetRevealState = () => {
    setIsRevealed(false);
    setRevealedAssignments([]);
    cancelAnimation(shakeX);
    shakeX.set(0);
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
    revealProgress.set(0);

    cancelAnimation(shakeX);
    shakeX.set(0);

    transitionTouchAllocationLifecycle(lifecycleStore, lifecycleConfiguration, {
      type: "reset",
    });

    for (let i = 0; i < MAX_OBSERVED_PLAYER_COUNT; i += 1) {
      cancelAnimation(slotOpacity[i]);
      cancelAnimation(slotScale[i]);
      slotOpacity[i].set(0);
      slotScale[i].set(1);
      slotRevealTeams[i].set(0);
      slotRevealProgress[i].set(0);
    }
  };

  const handleCountChange = (count: number, token?: number) => {
    if (token !== undefined && !isCurrentToken(revealToken, token)) {
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
    for (let index = 0; index < MAX_OBSERVED_PLAYER_COUNT; index += 1) {
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
      return player
        ? [
            {
              slotIndex: touch.slotIndex,
              team: player.team,
            },
          ]
        : [];
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

  const startCountdown = (count: number, token: number) => {
    "worklet";
    cancelAnimation(revealProgress);
    revealProgress.set(0);
    cancelAnimation(shakeX);
    shakeX.set(0);

    revealProgress.set(
      withDelay(
        HIGHLIGHT_DELAY_MS,
        withTiming(1, { duration: 0 }, (finished) => {
          if (finished) {
            const result = transitionTouchAllocationLifecycle(
              lifecycleStore,
              lifecycleConfiguration,
              { type: "countdownCompleted", token },
            );
            if (result.snapshot) {
              scheduleOnRN(handleReveal, token, result.snapshot);
            }
          }
        }),
      ),
    );
  };

  const notifyExitReady = () => {
    props.onExitReady();
  };

  const applyLifecycleResult = (result: TouchAllocationLifecycleResult) => {
    "worklet";
    const effects = getTouchAllocationLifecycleEffects(result);
    for (let index = 0; index < effects.length; index += 1) {
      const effect = effects[index];
      if (effect.type === "exitReady") {
        scheduleOnRN(notifyExitReady);
        continue;
      }
      if (effect.type === "revealReady") {
        scheduleOnRN(handleReveal, revealToken.get(), effect.snapshot);
        continue;
      }
      if (effect.type === "touchCapacityExceeded") {
        if (Platform.OS === "android") {
          scheduleOnRN(feedback.showAndroidTouchLimitToast);
        } else if (Platform.OS === "ios") {
          scheduleOnRN(feedback.showIosTouchLimitToast);
        }
        continue;
      }

      scheduleOnRN(handleCountChange, effect.count, revealToken.get());
      if (effect.countdownToken === null) {
        cancelAnimation(revealProgress);
        revealProgress.set(0);
        cancelAnimation(shakeX);
        shakeX.set(0);
      } else {
        startCountdown(effect.count, effect.countdownToken);
      }
    }
  };
  const resetAllSlotsEvent = useEffectEvent(resetAllSlots);

  const completeExitIfReady = () => {
    "worklet";
    if (isExitReady(lifecycleStore, lifecycleStore.exitPending.get())) {
      lifecycleStore.exitPending.set(false);
      scheduleOnRN(notifyExitReady);
    }
  };

  const requestExit = () => {
    "worklet";
    canAcceptNewTouches.set(false);
    const result = transitionTouchAllocationLifecycle(
      lifecycleStore,
      lifecycleConfiguration,
      { type: "requestExit" },
    );
    applyLifecycleResult(result);
  };

  const resetIfNoTrackedTouches = () => {
    "worklet";
    if (countTrackedTouches(lifecycleStore) === 0) {
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

      if (!canAcceptNewTouches.get() || !props.isRoundNavigationIdle.get()) {
        return;
      }

      for (const touch of event.changedTouches) {
        const x = touch.absoluteX;
        const y = touch.absoluteY;
        const ignored = isTouchIgnored(x, y);
        if (isRevealedSv.get()) {
          continue;
        }
        if (ignored) {
          continue;
        }
        const result = transitionTouchAllocationLifecycle(
          lifecycleStore,
          lifecycleConfiguration,
          {
            type: "admit",
            touchId: touch.id,
            x,
            y,
            isIgnored: ignored,
            acceptsNewTouches:
              canAcceptNewTouches.get() && props.isRoundNavigationIdle.get(),
          },
        );
        const slot = result.slotIndex;
        if (result.wasAllocated && slot !== -1) {
          cancelAnimation(slotOpacity[slot]);
          cancelAnimation(slotScale[slot]);
          cancelAnimation(slotRevealProgress[slot]);
          slotRevealTeams[slot].set(0);
          slotRevealProgress[slot].set(0);
          slotOpacity[slot].set(0);
          slotScale[slot].set(0.7);
          slotOpacity[slot].set(withTiming(1, { duration: 120 }));
          slotScale[slot].set(
            withSpring(1, {
              damping: 40,
              stiffness: 5000,
            }),
          );
          scheduleOnRN(H.touchDown);
          scheduleOnRN(feedback.playBubble, slot);
        }
        applyLifecycleResult(result);
      }
      scheduleOnRN(
        handleTrackedTouchChange,
        countTrackedTouches(lifecycleStore),
      );
    })
    .onTouchesMove((event) => {
      "worklet";
      for (const touch of event.changedTouches) {
        const slot = findTouchSlot(slotStore, touch.id);
        if (slot === -1) {
          continue;
        }
        const x = touch.absoluteX;
        const y = touch.absoluteY;
        const ignored = isTouchIgnored(x, y);
        const result = transitionTouchAllocationLifecycle(
          lifecycleStore,
          lifecycleConfiguration,
          { type: "move", touchId: touch.id, x, y, isIgnored: ignored },
        );
        if (result.visibilityChanged) {
          applyLifecycleResult(result);
        }
      }
    })
    .onTouchesUp((event, stateManager) => {
      "worklet";

      // Always process cleanup; if disabled mid-gesture, we still must clear visuals.
      for (const touch of event.changedTouches) {
        const result = transitionTouchAllocationLifecycle(
          lifecycleStore,
          lifecycleConfiguration,
          { type: "release", touchId: touch.id },
        );
        const slot = result.slotIndex;
        if (slot === -1) continue;

        slotOpacity[slot].set(
          withTiming(0, { duration: 140 }, (done) => {
            if (done && slotTouchId[slot].get() === -1) {
              slotActive[slot].set(0);
              slotScale[slot].set(1);
            }
          }),
        );
        applyLifecycleResult(result);
      }

      const isStillDown = (id: number) => {
        "worklet";
        for (let i = 0; i < event.allTouches.length; i += 1) {
          if (event.allTouches[i].id === id) return true;
        }
        return false;
      };

      for (let i = 0; i < MAX_OBSERVED_PLAYER_COUNT; i += 1) {
        const id = slotTouchId[i].get();
        if (id !== -1 && !isStillDown(id)) {
          slotTouchId[i].set(-1);
          slotActive[i].set(0);
          slotOpacity[i].set(0);
          slotScale[i].set(1);
        }
      }

      const synchronized = transitionTouchAllocationLifecycle(
        lifecycleStore,
        lifecycleConfiguration,
        { type: "synchronize" },
      );
      applyLifecycleResult(synchronized);
      const remainingTracked = synchronized.trackedCount;
      scheduleOnRN(handleTrackedTouchChange, remainingTracked);

      // If there are no more touches, do an immediate UI-thread reset.
      if (remainingTracked === 0) {
        hardResetSlotsWorklet(); // ✅ synchronous UI-thread clear
        scheduleOnRN(resetAllSlotsJS); // ✅ JS state/timers cleanup
        completeExitIfReady();
        stateManager.end();
        return;
      }
    })

    .onTouchesCancelled((event, stateManager) => {
      "worklet";

      const reachedIosTouchLimit =
        Platform.OS === "ios" &&
        (props.allowOverExpected ?? false) &&
        !isRevealedSv.get() &&
        countVisibleTouches(slotStore) === 5;

      if (reachedIosTouchLimit) {
        scheduleOnRN(feedback.showIosTouchLimitToast);
      }

      const result = transitionTouchAllocationLifecycle(
        lifecycleStore,
        lifecycleConfiguration,
        { type: "cancel" },
      );
      applyLifecycleResult(result);
      hardResetSlotsWorklet();
      scheduleOnRN(resetAllSlotsJS);
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
