import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import { planBalancedRoundAssignment } from "@/src/domain/team-allocation";
import type { RoundAssignment, TeamNumber } from "@/src/domain/team-identity";
import type { FrozenDot, TouchRect } from "@/src/helpers/types/home-screen";
import type { TouchPoint } from "@/src/helpers/types/touch-point";
import { H, Step, styleChargeBomb } from "@/src/screens/utils/helper";
import { AntDesign } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { Button, cn } from "heroui-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  Easing,
  makeMutable,
  SharedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN, scheduleOnUI } from "react-native-worklets";
import Dot from "./dot";

const BASE_CIRCLE_SIZE = 120;
const REVEAL_CIRCLE_SIZE = 150;
const HIGHLIGHT_DELAY_MS = 3000;
const MAX_SLOTS = 12;
const SHAKE_DURATION_MS = 1600;
const PRE_REVEAL_SILENCE_MS = Math.max(
  0,
  HIGHLIGHT_DELAY_MS - SHAKE_DURATION_MS,
);

// Shake tuning (px + ms)
// -> end of countdown should feel “nervous”, not “wobble”
const SHAKE_AMP_MIN = 1.5;
const SHAKE_AMP_MAX = 16;

const SHAKE_OSC_MIN = 2;
const SHAKE_OSC_MAX = 9;

const SHAKE_OSC_MS_SLOW = 34; // early: slower movement
const SHAKE_OSC_MS_FAST = 12; // end: very fast jitter

const SHAKE_SETTLE_MS_SLOW = 120;
const SHAKE_SETTLE_MS_FAST = 50;

const bubbleModules = [
  require("../../../assets/audio/bubble-1.wav"),
  require("../../../assets/audio/bubble-2.wav"),
  require("../../../assets/audio/bubble-3.wav"),
  require("../../../assets/audio/bubble-4.wav"),
  require("../../../assets/audio/bubble-5.wav"),
] as const;

const setupAudioMode = async () => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      ...(Platform.OS === "ios" ? { interruptionMode: "mixWithOthers" } : {}),
    });
  } catch (error) {
    console.warn("setAudioModeAsync failed", error);
  }
};

const useBubblePlayers = () => {
  const [uris, setUris] = useState<(string | null)[]>(
    Array.from({ length: bubbleModules.length }, () => null),
  );
  const pendingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const modules = bubbleModules.map((module) => module);

    Asset.loadAsync(modules)
      .then((assets) => {
        if (cancelled) {
          return;
        }
        setUris(assets.map((asset) => asset.localUri ?? asset.uri));
      })
      .catch((error) => {
        console.warn("Failed to load bubble assets", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const players = [
    useAudioPlayer(uris[0], {
      keepAudioSessionActive: true,
      downloadFirst: true,
    }),
    useAudioPlayer(uris[1], {
      keepAudioSessionActive: true,
      downloadFirst: true,
    }),
    useAudioPlayer(uris[2], {
      keepAudioSessionActive: true,
      downloadFirst: true,
    }),
    useAudioPlayer(uris[3], {
      keepAudioSessionActive: true,
      downloadFirst: true,
    }),
    useAudioPlayer(uris[4], {
      keepAudioSessionActive: true,
      downloadFirst: true,
    }),
  ];

  const s0 = useAudioPlayerStatus(players[0]);
  const s1 = useAudioPlayerStatus(players[1]);
  const s2 = useAudioPlayerStatus(players[2]);
  const s3 = useAudioPlayerStatus(players[3]);
  const s4 = useAudioPlayerStatus(players[4]);
  const statuses = [s0, s1, s2, s3, s4] as const;

  useEffect(() => {
    statuses.forEach((status, index) => {
      if (!status.isLoaded || !pendingRef.current.has(index)) {
        return;
      }
      pendingRef.current.delete(index);
      const player = players[index];
      player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => {
          try {
            player.play();
          } catch {
            return;
          }
        });
    });
  }, [players, statuses]);

  return {
    players,
    statuses,
    pendingRef,
  };
};

export default function useSelectedPlayersLayer(props: {
  selectedTeams: number | null;
  onBack: () => void;
  toggleRectSv: SharedValue<TouchRect>;
  plusButtonRectSv: SharedValue<TouchRect>;
  onRevealSnapshot?: (dots: FrozenDot[]) => void;
  isTouchEnabled?: boolean;
  isScrollGestureActive?: boolean;
  expectedTouchCount?: number;
  allowOverExpected?: boolean;
  roundAssignment?: RoundAssignment;
  isInseparableEnabled?: boolean;
  resetKey?: number;
}): {
  touchGesture: ReturnType<typeof Gesture.Manual>;
  overlay: ReactNode;
  backButton: ReactNode;
  isRevealed: boolean;
  isTouching: boolean;
  touchCount: number;
} {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [touchCount, setTouchCount] = useState(0);
  const [slotRevealTeams, setSlotRevealTeams] = useState<(TeamNumber | null)[]>(
    Array.from({ length: MAX_SLOTS }, () => null),
  );
  const preRevealHapticsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const backRef = useRef<View>(null);
  const bubbleAudio = useBubblePlayers();
  const bubblePlayers = bubbleAudio.players;
  const bubbleStatuses = bubbleAudio.statuses;
  const bubblePendingRef = bubbleAudio.pendingRef;
  const isRevealedSv = useSharedValue(0);
  const stableCountSv = useSharedValue(0);
  const countTokenSv = useSharedValue(0);
  const revealProgress = useSharedValue(0);
  const revealToken = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeDirRef = useRef(1);
  const backBlurIntensity = useSharedValue(40);
  const backRectSv = useSharedValue<TouchRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isReady: false,
  });
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
  const isGestureEnabled =
    Boolean(props.selectedTeams) &&
    (props.isTouchEnabled ?? true) &&
    !(props.isScrollGestureActive ?? false);
  // Keep the native handler attached while Android is still tracking pointers.
  // Toggling Gesture.enabled mid-stream schedules an unsafe asynchronous cancel.
  const canAcceptNewTouches = useSharedValue(isGestureEnabled);

  const assignTeams = (touchList: TouchPoint[]) => {
    const assignments: Record<string, TeamNumber> = {};
    if (!props.selectedTeams) {
      return assignments;
    }

    const plannedAssignment =
      props.roundAssignment?.length === touchList.length
        ? props.roundAssignment
        : planBalancedRoundAssignment(
            props.selectedTeams,
            touchList.length,
            Math.random,
            { inseparable: props.isInseparableEnabled },
          );

    touchList.forEach((touch, index) => {
      assignments[touch.id] = plannedAssignment[index];
    });

    return assignments;
  };

  const clearPreRevealHaptics = () => {
    preRevealHapticsRef.current.forEach((timerId) => clearTimeout(timerId));
    preRevealHapticsRef.current = [];
  };

  const resetRevealState = () => {
    setIsRevealed(false);
    setSlotRevealTeams(Array.from({ length: MAX_SLOTS }, () => null));
    cancelAnimation(shakeX);
    shakeX.value = 0;
    clearPreRevealHaptics();
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

    revealToken.value += 1;
    countTokenSv.value += 1;
    isRevealedSv.value = 0;
    stableCountSv.value = 0;

    for (let i = 0; i < MAX_SLOTS; i += 1) {
      cancelAnimation(slotOpacity[i]);
      cancelAnimation(slotScale[i]);
      slotActive[i].value = 0;
      slotOpacity[i].value = 0;
      slotScale[i].value = 1;
      slotTouchId[i].value = -1;
    }
  };

  const schedulePreRevealHaptics = (
    totalDelayMs: number,
    startAfterMs: number,
  ) => {
    const scheduleSteps = (
      windowMs: number,
      steps: Step[],
      offsetMs: number,
    ) => {
      clearPreRevealHaptics();

      // reset shake state at the beginning of a new schedule
      shakeDirRef.current = 1;
      cancelAnimation(shakeX);
      shakeX.value = 0;

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      const kindMultiplier = (fn: Step["fn"]) => {
        // make soft beats still visible, but weaker
        if (fn === H.arm) return 0.35;
        if (fn === H.tickSoft) return 0.5;
        if (fn === H.tick) return 0.7;
        if (fn === H.tickStrong) return 0.9;
        if (fn === H.snap) return 1.0;
        return 0.45;
      };

      const kickShake = (p: number, fn: Step["fn"]) => {
        const t = Math.max(0, Math.min(1, p));

        // ramp harder near the end (more “panic”)
        const energy = Math.pow(t, 2.6); // 0..1

        const ampBase = lerp(SHAKE_AMP_MIN, SHAKE_AMP_MAX, energy);
        const amp = ampBase * kindMultiplier(fn);

        if (amp < 0.25) return;

        const oscillations = Math.round(
          lerp(SHAKE_OSC_MIN, SHAKE_OSC_MAX, energy),
        );
        const oscMs = Math.round(
          lerp(SHAKE_OSC_MS_SLOW, SHAKE_OSC_MS_FAST, energy),
        );
        const settleMs = Math.round(
          lerp(SHAKE_SETTLE_MS_SLOW, SHAKE_SETTLE_MS_FAST, energy),
        );

        // alternate overall direction per beat (keeps it organic)
        shakeDirRef.current *= -1;
        let dir = shakeDirRef.current;

        const seq: any[] = [];
        const denom = Math.max(1, oscillations - 1);

        // Main burst: fast alternating oscillations, slightly damped
        for (let i = 0; i < oscillations; i += 1) {
          const decay = 1 - (i / denom) * 0.6; // 1.0 -> 0.4
          seq.push(
            withTiming(dir * amp * decay, {
              duration: oscMs,
              easing: Easing.linear,
            }),
          );
          dir *= -1;
        }

        // Extra micro-buzz only at the very end (last ~15%)
        if (t > 0.85) {
          const buzzAmp = amp * 0.22;
          seq.push(
            withTiming(buzzAmp, { duration: 12, easing: Easing.linear }),
            withTiming(-buzzAmp, { duration: 12, easing: Easing.linear }),
            withTiming(buzzAmp, { duration: 12, easing: Easing.linear }),
            withTiming(0, { duration: 12, easing: Easing.linear }),
          );
        }

        // Return to rest
        seq.push(
          withTiming(0, {
            duration: settleMs,
            easing: Easing.out(Easing.quad),
          }),
        );

        // Assign sequence directly to the shared value (intended Reanimated usage). :contentReference[oaicite:0]{index=0}
        shakeX.value = withSequence(...seq);
      };

      steps.forEach((step) => {
        if (step.t < 0 || step.t > windowMs) return;

        const timerId = setTimeout(() => {
          const p = step.t / windowMs;

          // “shake produces haptic”
          kickShake(p, step.fn);
          void step.fn();
        }, offsetMs + step.t);

        preRevealHapticsRef.current.push(timerId);
      });
    };

    // window = last part of the countdown (where we want the charge/shake)
    const windowMs = Math.max(1, totalDelayMs - startAfterMs);

    // IMPORTANT: build the haptic pattern *for the window*, then offset it into the global countdown
    scheduleSteps(windowMs, styleChargeBomb(windowMs), startAfterMs);
  };

  const handleCountChange = (count: number, token?: number) => {
    if (token !== undefined && token !== countTokenSv.value) {
      return;
    }
    const expectedCount = props.expectedTouchCount ?? 2;
    const allowOverExpected = props.allowOverExpected ?? false;
    const meetsExpected = allowOverExpected
      ? count >= expectedCount
      : count === expectedCount;
    resetRevealState();
    setIsTouching(count > 0);
    setTouchCount(count);
    if (meetsExpected && count >= 1) {
      schedulePreRevealHaptics(HIGHLIGHT_DELAY_MS, PRE_REVEAL_SILENCE_MS);
    }
  };

  const handleReveal = (token: number, revealedTouchCount: number) => {
    if (!props.selectedTeams) {
      return;
    }
    const touches: TouchPoint[] = [];
    for (let i = 0; i < MAX_SLOTS; i += 1) {
      if (slotActive[i].value === 1 && slotTouchId[i].value !== -1) {
        touches.push({
          id: String(slotTouchId[i].value),
          x: slotX[i].value,
          y: slotY[i].value,
        });
      }
    }
    if (token !== revealToken.get() || touches.length !== revealedTouchCount) {
      return;
    }

    const assignments = assignTeams(touches);
    const nextRevealTeams: (TeamNumber | null)[] = Array.from(
      { length: MAX_SLOTS },
      () => null,
    );

    for (let i = 0; i < MAX_SLOTS; i += 1) {
      const touchId = slotTouchId[i].value;
      if (slotActive[i].value !== 1 || touchId === -1) {
        continue;
      }
      const id = String(touchId);
      nextRevealTeams[i] = assignments[id] ?? null;
    }

    cancelAnimation(shakeX);
    shakeX.value = withTiming(0, { duration: 120 });

    setSlotRevealTeams(nextRevealTeams);
    setIsRevealed(true);
    clearPreRevealHaptics();
    if (props.onRevealSnapshot) {
      const snapshot: FrozenDot[] = [];
      for (let i = 0; i < MAX_SLOTS; i += 1) {
        if (slotActive[i].value !== 1 || slotTouchId[i].value === -1) {
          continue;
        }
        const team = nextRevealTeams[i];
        if (!team) {
          continue;
        }
        snapshot.push({
          x: slotX[i].value,
          y: slotY[i].value,
          team,
        });
      }
      props.onRevealSnapshot(snapshot);
    }
  };

  const playBubble = (soundIndex: number) => {
    const clampedIndex =
      bubblePlayers.length === 0 ? 0 : soundIndex % bubblePlayers.length;
    if (bubblePlayers.length === 0) {
      return;
    }
    const player = bubblePlayers[clampedIndex];
    const status = bubbleStatuses[clampedIndex];
    if (!status.isLoaded) {
      bubblePendingRef.current.add(clampedIndex);
      return;
    }
    player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => {
        try {
          player.play();
        } catch {
          return;
        }
      });
  };

  const isPointInsideRect = (x: number, y: number, rect: TouchRect) => {
    "worklet";
    if (!rect.isReady) {
      return false;
    }
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    );
  };

  const isTouchIgnored = (x: number, y: number) => {
    "worklet";
    return (
      isPointInsideRect(x, y, props.toggleRectSv.value) ||
      isPointInsideRect(x, y, backRectSv.value) ||
      isPointInsideRect(x, y, props.plusButtonRectSv.value)
    );
  };

  const findSlotByTouchId = (touchId: number) => {
    "worklet";
    for (let i = 0; i < MAX_SLOTS; i += 1) {
      if (slotTouchId[i].value === touchId) {
        return i;
      }
    }
    return -1;
  };

  const allocFreeSlot = (touchId: number) => {
    "worklet";
    for (let i = 0; i < MAX_SLOTS; i += 1) {
      if (slotTouchId[i].value === -1) {
        slotTouchId[i].value = touchId;
        slotActive[i].value = 1;
        return i;
      }
    }
    return -1;
  };

  const countVisibleTouches = () => {
    "worklet";
    let count = 0;
    for (let i = 0; i < MAX_SLOTS; i += 1) {
      if (slotActive[i].value === 1 && slotTouchId[i].value !== -1) {
        count += 1;
      }
    }
    return count;
  };

  const startCountdown = (count: number) => {
    "worklet";
    cancelAnimation(revealProgress);
    revealProgress.value = 0;
    cancelAnimation(shakeX);
    shakeX.value = 0;
    revealToken.value += 1;
    const token = revealToken.value;

    const expectedCount = props.expectedTouchCount ?? 2;
    const allowOverExpected = props.allowOverExpected ?? false;
    scheduleOnRN(handleCountChange, count, countTokenSv.value);
    const meetsExpected = allowOverExpected
      ? count >= expectedCount
      : count === expectedCount;
    if (count < 1 || !meetsExpected) {
      return;
    }

    revealProgress.value = withDelay(
      HIGHLIGHT_DELAY_MS,
      withTiming(1, { duration: 0 }, (finished) => {
        if (finished && token === revealToken.value) {
          const currentCount = countVisibleTouches();
          isRevealedSv.value = 1;
          scheduleOnRN(handleReveal, token, currentCount);
        }
      }),
    );
  };

  const updateStableCount = (count: number) => {
    "worklet";
    if (isRevealedSv.value === 1) {
      return;
    }
    const expectedCount = props.expectedTouchCount ?? 2;
    const allowOverExpected = props.allowOverExpected ?? false;
    if (!allowOverExpected && count > expectedCount) {
      cancelAnimation(revealProgress);
      revealProgress.value = 0;

      cancelAnimation(shakeX);
      shakeX.value = 0;

      revealToken.value += 1;
      stableCountSv.value = count;
      countTokenSv.value += 1;
      scheduleOnRN(handleCountChange, count, countTokenSv.value);
      return;
    }
    if (count === stableCountSv.value) {
      return;
    }
    stableCountSv.value = count;
    countTokenSv.value += 1;
    startCountdown(count);
  };

  const handleBack = () => {
    props.onBack();
    resetAllSlots();
  };

  useEffect(() => {
    void setupAudioMode();
    return () => {
      clearPreRevealHaptics();
    };
  }, []);

  useEffect(() => {
    resetAllSlots();
    if (!props.selectedTeams) {
      props.plusButtonRectSv.value = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        isReady: false,
      };
      backRectSv.value = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        isReady: false,
      };
    }
  }, [props.selectedTeams, props.plusButtonRectSv, backRectSv]);

  useEffect(() => {
    if (props.resetKey !== undefined) {
      resetAllSlots();
    }
  }, [props.resetKey]);

  useEffect(() => {
    if (props.isScrollGestureActive) {
      resetAllSlots();
    }
  }, [props.isScrollGestureActive]);

  useEffect(() => {
    canAcceptNewTouches.value = isGestureEnabled;
  }, [canAcceptNewTouches, isGestureEnabled]);

  const touchGesture = Gesture.Manual()
    .onTouchesDown((event) => {
      "worklet";

      if (!canAcceptNewTouches.value) {
        return;
      }

      for (const touch of event.changedTouches) {
        const x = touch.absoluteX;
        const y = touch.absoluteY;
        const ignored = isTouchIgnored(x, y);
        if (isRevealedSv.value === 1) {
          const slot = findSlotByTouchId(touch.id);
          if (slot !== -1) {
            slotX[slot].value = x;
            slotY[slot].value = y;
          }
          continue;
        }
        if (ignored) {
          continue;
        }
        let slot = findSlotByTouchId(touch.id);
        if (slot === -1) {
          slot = allocFreeSlot(touch.id);
          if (slot !== -1) {
            slotOpacity[slot].value = 0;
            slotScale[slot].value = 0.7;
            slotOpacity[slot].value = withTiming(1, { duration: 120 });
            slotScale[slot].value = withSpring(1, {
              damping: 40,
              stiffness: 5000,
            });
            scheduleOnRN(H.touchDown);
            scheduleOnRN(playBubble, slot);
          }
        }
        if (slot !== -1) {
          slotX[slot].value = x;
          slotY[slot].value = y;
          slotActive[slot].value = ignored ? 0 : 1;
        }
      }

      const afterCount = countVisibleTouches();

      updateStableCount(afterCount);
    })
    .onTouchesMove((event) => {
      "worklet";
      let visibilityChanged = false;
      for (const touch of event.changedTouches) {
        const slot = findSlotByTouchId(touch.id);
        if (slot === -1) {
          continue;
        }
        const x = touch.absoluteX;
        const y = touch.absoluteY;
        slotX[slot].value = x;
        slotY[slot].value = y;
        if (isRevealedSv.value === 0) {
          const ignored = isTouchIgnored(x, y);
          const nextActive = ignored ? 0 : 1;
          if (slotActive[slot].value !== nextActive) {
            slotActive[slot].value = nextActive;
            visibilityChanged = true;
          }
        }
      }
      if (visibilityChanged) {
        updateStableCount(countVisibleTouches());
      }
    })
    .onTouchesUp((event, stateManager) => {
      "worklet";

      // Always process cleanup; if disabled mid-gesture, we still must clear visuals.
      for (const touch of event.changedTouches) {
        const slot = findSlotByTouchId(touch.id);
        if (slot === -1) continue;

        // Your existing logic (keep if desired)
        slotTouchId[slot].value = -1;

        slotOpacity[slot].value = withTiming(0, { duration: 140 }, (done) => {
          if (done && slotTouchId[slot].value === -1) {
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
        const id = slotTouchId[i].value;
        if (id !== -1 && !isStillDown(id)) {
          slotTouchId[i].value = -1;
          slotActive[i].value = 0;
          slotOpacity[i].value = 0;
          slotScale[i].value = 1;
        }
      }

      const remaining = countVisibleTouches();

      // If there are no more touches, do an immediate UI-thread reset.
      if (remaining === 0) {
        hardResetSlotsWorklet(); // ✅ synchronous UI-thread clear
        scheduleOnRN(resetAllSlotsJS); // ✅ JS state/timers cleanup
        stateManager.end();
        return;
      }

      // Otherwise continue normal logic.
      updateStableCount(remaining);
    })

    .onTouchesCancelled((event, stateManager) => {
      "worklet";

      hardResetSlotsWorklet();
      scheduleOnRN(resetAllSlotsJS);
      stateManager.end();
    });

  const backButton = props.selectedTeams ? (
    <Button
      size="md"
      className={cn(
        "absolute top-16 left-6 z-10 border border-white/60 rounded-full size-12 items-center justify-center px-0 overflow-hidden bg-gray-100/40 active:bg-gray-100/80 active:text-white",
      )}
      animation={{
        scale: {
          value: 1.03,
          timingConfig: { duration: 170 },
        },
        highlight: {
          backgroundColor: { value: "transparent" },
          opacity: { value: [0, 0] },
        },
      }}
      accessibilityRole="button"
      accessibilityLabel="Close"
      accessibilityHint="Returns to team selection"
      onPress={handleBack}
      onLayout={() => {
        backRef.current?.measureInWindow((x, y, width, height) => {
          backRectSv.value = { x, y, width, height, isReady: true };
        });
      }}
      ref={backRef}
      isIconOnly
    >
      <AnimatedBlurView
        blurIntensity={backBlurIntensity}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className="bg-white/15"
      />
      <Button.Label className="">
        <AntDesign name="close" size={20} color="rgba(0,0,0,0.8)" />
      </Button.Label>
    </Button>
  ) : null;

  const overlay = props.selectedTeams ? (
    <>
      {slotActive.map((active, index) => {
        const team = slotRevealTeams[index];
        return (
          <Dot
            key={index}
            x={slotX[index]}
            y={slotY[index]}
            active={active}
            opacity={slotOpacity[index]}
            scale={slotScale[index]}
            shakeX={shakeX}
            holdProgress={revealProgress}
            team={isRevealed && team ? team : undefined}
            isRevealed={isRevealed}
            baseSize={BASE_CIRCLE_SIZE}
            revealSize={REVEAL_CIRCLE_SIZE}
          />
        );
      })}
    </>
  ) : null;

  return {
    touchGesture,
    overlay,
    backButton,
    isRevealed,
    isTouching,
    touchCount,
  };
}
