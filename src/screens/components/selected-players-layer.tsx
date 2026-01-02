import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import type { FrozenDot, TouchRect } from "@/src/helpers/types/home-screen";
import type { TouchPoint } from "@/src/helpers/types/touch-point";
import { H, Step, styleChargeBomb } from "@/src/screens/utils/helper";
import { AntDesign } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { Button, cn } from "heroui-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  Easing,
  makeMutable,
  runOnUI,
  SharedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Dot from "./dot";

const BASE_CIRCLE_SIZE = 120;
const REVEAL_CIRCLE_SIZE = 150;
const HIGHLIGHT_DELAY_MS = 3000;
const TEAM_COLORS = ["#9d659f", "#FB7185", "#415679", "#FFE4E6", "#E11D48"];
const MAX_SLOTS = 12;
const BUBBLE_THROTTLE_MS = 80;
const SHAKE_DURATION_MS = 1600;
const SHAKE_AMPLITUDE = 10;
const SHAKE_KICK_IN_MS = 24;
const SHAKE_KICK_OUT_MS = 110;
const PRE_REVEAL_SILENCE_MS = Math.max(
  0,
  HIGHLIGHT_DELAY_MS - SHAKE_DURATION_MS
);

export function useSelectedPlayersLayer(props: {
  selectedTeams: number | null;
  onBack: () => void;
  toggleRectSv: SharedValue<TouchRect>;
  plusButtonRectSv: SharedValue<TouchRect>;
  onRevealSnapshot?: (dots: FrozenDot[]) => void;
  isTouchEnabled?: boolean;
  isScrollGestureActive?: boolean;
  expectedTouchCount?: number;
  allowOverExpected?: boolean;
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
  const [slotRevealColors, setSlotRevealColors] = useState<string[]>(
    Array.from({ length: MAX_SLOTS }, () => "")
  );
  const [slotRevealLabels, setSlotRevealLabels] = useState<(string | null)[]>(
    Array.from({ length: MAX_SLOTS }, () => null)
  );
  const preRevealHapticsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const backRef = useRef<View>(null);
  const lastBubbleAtRef = useRef<number>(0);
  const teamOrderRef = useRef<string[] | null>(null);
  const bubblePlayer = useAudioPlayer(
    require("../../../assets/audio/bubble.wav"),
    { keepAudioSessionActive: true, downloadFirst: true }
  );
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
    []
  );
  const slotX = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    []
  );
  const slotY = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    []
  );
  const slotOpacity = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(0)),
    []
  );
  const slotScale = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(1)),
    []
  );
  const slotTouchId = useMemo(
    () => Array.from({ length: MAX_SLOTS }, () => makeMutable(-1)),
    []
  );
  const activeTeamColors = useMemo(
    () =>
      props.selectedTeams ? TEAM_COLORS.slice(0, props.selectedTeams) : [],
    [props.selectedTeams]
  );

  const isGestureEnabled =
    Boolean(props.selectedTeams) &&
    (props.isTouchEnabled ?? true) &&
    !(props.isScrollGestureActive ?? false);

  useEffect(() => {
    if (!props.selectedTeams) {
      teamOrderRef.current = null;
      return;
    }
    const nextOrder = TEAM_COLORS.slice(0, props.selectedTeams);
    for (let i = nextOrder.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextOrder[i], nextOrder[j]] = [nextOrder[j], nextOrder[i]];
    }
    teamOrderRef.current = nextOrder;
  }, [props.selectedTeams]);

  const assignTeams = (touchList: TouchPoint[]) => {
    const assignments: Record<string, string> = {};
    const numbers: Record<string, number> = {};
    if (activeTeamColors.length === 0) {
      return { assignments, numbers };
    }
    let colorPool = [...activeTeamColors];

    const shuffle = <T,>(values: T[]): T[] => {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    touchList.forEach((touch, index) => {
      if (index % activeTeamColors.length === 0) {
        colorPool = shuffle(activeTeamColors);
      }
      const poolIndex = index % activeTeamColors.length;
      const color = colorPool[poolIndex];
      assignments[touch.id] = color;
    });

    const baseOrder = teamOrderRef.current ?? activeTeamColors;
    const colorToNumber = baseOrder.reduce<Record<string, number>>(
      (acc, color, idx) => {
        acc[color] = idx + 1;
        return acc;
      },
      {}
    );

    touchList.forEach((touch) => {
      const color = assignments[touch.id];
      numbers[touch.id] = colorToNumber[color];
    });

    return { assignments, numbers };
  };

  const clearPreRevealHaptics = () => {
    preRevealHapticsRef.current.forEach((timerId) => clearTimeout(timerId));
    preRevealHapticsRef.current = [];
  };

  const resetRevealState = () => {
    setIsRevealed(false);
    setSlotRevealColors(Array.from({ length: MAX_SLOTS }, () => ""));
    setSlotRevealLabels(Array.from({ length: MAX_SLOTS }, () => null));
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
    runOnUI(hardResetSlotsWorklet)();
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
    startAfterMs: number
  ) => {
    const scheduleSteps = (totalMs: number, steps: Step[], startAfter = 0) => {
      clearPreRevealHaptics();

      // reset shake state at the beginning of a new schedule
      shakeDirRef.current = 1;
      cancelAnimation(shakeX);
      shakeX.value = 0;

      const windowMs = Math.max(1, totalMs - startAfter);

      const kindMultiplier = (fn: Step["fn"]) => {
        if (fn === H.tickSoft) return 0.35;
        if (fn === H.tick) return 0.55;
        if (fn === H.tickStrong) return 0.8;
        if (fn === H.snap) return 1.0;
        return 0.25;
      };

      const kickShake = (p: number, fn: Step["fn"]) => {
        const clamped = Math.max(0, Math.min(1, p));
        const envelope = 0.1 + 0.9 * clamped * clamped;
        const amp = SHAKE_AMPLITUDE * kindMultiplier(fn) * envelope;

        if (amp < 0.25) {
          return;
        }

        shakeDirRef.current *= -1;
        const dir = shakeDirRef.current;

        shakeX.value = withSequence(
          withTiming(dir * amp, {
            duration: SHAKE_KICK_IN_MS,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(0, {
            duration: SHAKE_KICK_OUT_MS,
            easing: Easing.out(Easing.quad),
          })
        );
      };

      steps.forEach((step) => {
        if (step.t < startAfter || step.t > totalMs) return;

        const timerId = setTimeout(() => {
          const p = (step.t - startAfter) / windowMs;
          kickShake(p, step.fn);
          void step.fn();
        }, step.t);

        preRevealHapticsRef.current.push(timerId);
      });
    };

    scheduleSteps(totalDelayMs, styleChargeBomb(totalDelayMs), startAfterMs);
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

  const handleReveal = () => {
    if (activeTeamColors.length === 0) {
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

    const { assignments, numbers } = assignTeams(touches);
    const nextRevealColors = Array.from({ length: MAX_SLOTS }, () => "");
    const nextRevealLabels: (string | null)[] = Array.from(
      { length: MAX_SLOTS },
      () => null
    );

    for (let i = 0; i < MAX_SLOTS; i += 1) {
      const touchId = slotTouchId[i].value;
      if (slotActive[i].value !== 1 || touchId === -1) {
        continue;
      }
      const id = String(touchId);
      nextRevealColors[i] = assignments[id] ?? "";
      const teamNumber = numbers[id];
      nextRevealLabels[i] = teamNumber ? String(teamNumber) : null;
    }

    cancelAnimation(shakeX);
    shakeX.value = withTiming(0, { duration: 120 });

    setSlotRevealColors(nextRevealColors);
    setSlotRevealLabels(nextRevealLabels);
    setIsRevealed(true);
    clearPreRevealHaptics();
    if (props.onRevealSnapshot) {
      const snapshot: FrozenDot[] = [];
      for (let i = 0; i < MAX_SLOTS; i += 1) {
        if (slotActive[i].value !== 1 || slotTouchId[i].value === -1) {
          continue;
        }
        const color = nextRevealColors[i];
        if (!color) {
          continue;
        }
        snapshot.push({
          x: slotX[i].value,
          y: slotY[i].value,
          color,
          label: nextRevealLabels[i] ?? undefined,
        });
      }
      props.onRevealSnapshot(snapshot);
    }
    H.boom();
  };

  const playBubble = () => {
    const now = Date.now();
    if (now - lastBubbleAtRef.current < BUBBLE_THROTTLE_MS) {
      return;
    }
    lastBubbleAtRef.current = now;
    if (!bubblePlayer.isLoaded) {
      return;
    }
    bubblePlayer.seekTo(0).catch(() => {});
    bubblePlayer.play();
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
          scheduleOnRN(handleReveal);
        }
      })
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
    void setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
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

  const touchGesture = Gesture.Manual()
    .enabled(isGestureEnabled)
    .onTouchesDown((event) => {
      "worklet";

      let didAddTouch = false;
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
            didAddTouch = true;
            slotOpacity[slot].value = 0;
            slotScale[slot].value = 0.7;
            slotOpacity[slot].value = withTiming(1, { duration: 120 });
            slotScale[slot].value = withSpring(1, {
              damping: 40,
              stiffness: 5000,
            });
          }
        }
        if (slot !== -1) {
          slotX[slot].value = x;
          slotY[slot].value = y;
          slotActive[slot].value = ignored ? 0 : 1;
        }
      }

      const afterCount = countVisibleTouches();

      if (didAddTouch) {
        scheduleOnRN(playBubble);
      }

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
        "absolute top-16 left-6 z-10 border border-white/60 rounded-full size-12 items-center justify-center px-0 overflow-hidden bg-gray-100/40 active:bg-gray-100/80 active:text-white"
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
        const revealColor = slotRevealColors[index] || "#0B0B0B";
        const label = slotRevealLabels[index];
        return (
          <Dot
            key={index}
            x={slotX[index]}
            y={slotY[index]}
            active={active}
            opacity={slotOpacity[index]}
            scale={slotScale[index]}
            shakeX={shakeX}
            baseColor="#FFFFFF"
            revealColor={revealColor}
            isRevealed={isRevealed}
            baseSize={BASE_CIRCLE_SIZE}
            revealSize={REVEAL_CIRCLE_SIZE}
            label={isRevealed && label ? label : undefined}
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

export default useSelectedPlayersLayer;
