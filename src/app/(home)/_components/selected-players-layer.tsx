import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Button, cn } from "heroui-native";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import {
  cancelAnimation,
  makeMutable,
  SharedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { FrozenDot, TouchRect } from "../../../helpers/types/home-screen";
import type { TouchPoint } from "../../../helpers/types/touch-point";
import Dot from "./dot";

const BASE_CIRCLE_SIZE = 100;
const REVEAL_CIRCLE_SIZE = BASE_CIRCLE_SIZE * 1.5;
const HIGHLIGHT_DELAY_MS = 3000;
const TEAM_COLORS = ["#F64D00", "#1F3A5F", "#2FBF71", "#F2C14E", "#00A3E0"];
const MAX_SLOTS = 12;
const BUBBLE_THROTTLE_MS = 80;
const SHAKE_DURATION_MS = 800;
const SHAKE_STEP_MS = 30;
const SHAKE_CYCLES = Math.max(1, Math.floor(SHAKE_DURATION_MS / SHAKE_STEP_MS));
const SHAKE_AMPLITUDE = 10;

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
    require("../../../../assets/audio/bubble.wav"),
    { keepAudioSessionActive: true, downloadFirst: true }
  );
  const isEnabledSv = useSharedValue(0);
  const isRevealedSv = useSharedValue(0);
  const stableCountSv = useSharedValue(0);
  const countTokenSv = useSharedValue(0);
  const revealProgress = useSharedValue(0);
  const revealToken = useSharedValue(0);
  const shakePhase = useSharedValue(0.5);
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
  const isIosPhone = Platform.OS === "ios" && !Platform.isPad;

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

  const resetRevealState = (shouldCancelAnimation = true) => {
    setIsRevealed(false);
    setSlotRevealColors(Array.from({ length: MAX_SLOTS }, () => ""));
    setSlotRevealLabels(Array.from({ length: MAX_SLOTS }, () => null));
    isRevealedSv.value = 0;
    if (shouldCancelAnimation) {
      cancelAnimation(revealProgress);
      revealProgress.value = 0;
      cancelAnimation(shakePhase);
      shakePhase.value = 0.5;
    }
    preRevealHapticsRef.current.forEach((timerId) => clearTimeout(timerId));
    preRevealHapticsRef.current = [];
  };

  const resetAllSlots = () => {
    resetRevealState();
    setIsTouching(false);
    setTouchCount(0);
    stableCountSv.value = 0;
    revealToken.value += 1;
    for (let i = 0; i < MAX_SLOTS; i += 1) {
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
    preRevealHapticsRef.current.forEach((timerId) => clearTimeout(timerId));
    preRevealHapticsRef.current = [];

    if (totalDelayMs <= startAfterMs) {
      return;
    }

    const steps = [
      { offset: 3000, style: Haptics.ImpactFeedbackStyle.Soft },
      { offset: 2800, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 2200, style: Haptics.ImpactFeedbackStyle.Soft },
      { offset: 2100, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 1400, style: Haptics.ImpactFeedbackStyle.Soft },
      { offset: 1200, style: Haptics.ImpactFeedbackStyle.Soft },
      { offset: 600, style: Haptics.ImpactFeedbackStyle.Heavy },
      { offset: 500, style: Haptics.ImpactFeedbackStyle.Heavy },
      { offset: 400, style: Haptics.ImpactFeedbackStyle.Heavy },
      { offset: 200, style: Haptics.ImpactFeedbackStyle.Heavy },
    ];

    steps.forEach(({ offset, style }) => {
      const timeout = totalDelayMs - offset;
      if (timeout > startAfterMs) {
        const timerId = setTimeout(() => {
          Haptics.impactAsync(style);
        }, timeout);
        preRevealHapticsRef.current.push(timerId);
      }
    });
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
    resetRevealState(!meetsExpected);
    setIsTouching(count > 0);
    setTouchCount(count);
    if (meetsExpected && count >= 1) {
      schedulePreRevealHaptics(HIGHLIGHT_DELAY_MS, 1000);
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

    setSlotRevealColors(nextRevealColors);
    setSlotRevealLabels(nextRevealLabels);
    setIsRevealed(true);
    preRevealHapticsRef.current.forEach((timerId) => clearTimeout(timerId));
    preRevealHapticsRef.current = [];
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleFingerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
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
    cancelAnimation(shakePhase);
    shakePhase.value = 0.5;
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

    const shakeDelay = Math.max(0, HIGHLIGHT_DELAY_MS - SHAKE_DURATION_MS);
    shakePhase.value = withDelay(
      shakeDelay,
      withRepeat(
        withTiming(1, { duration: SHAKE_STEP_MS }),
        SHAKE_CYCLES,
        true,
        (finished) => {
          if (finished) {
            shakePhase.value = 0.8;
          }
        }
      )
    );

    revealProgress.value = withDelay(
      HIGHLIGHT_DELAY_MS,
      withTiming(1, { duration: 0 }, (finished) => {
        if (finished && token === revealToken.value) {
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
      preRevealHapticsRef.current.forEach((timerId) => clearTimeout(timerId));
      preRevealHapticsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const isTouchEnabled = props.isTouchEnabled ?? true;
    const isScrollGestureActive = props.isScrollGestureActive ?? false;
    isEnabledSv.value =
      props.selectedTeams && isTouchEnabled && !isScrollGestureActive ? 1 : 0;
  }, [
    props.selectedTeams,
    props.isTouchEnabled,
    props.isScrollGestureActive,
    isEnabledSv,
  ]);

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
    .onTouchesDown((event) => {
      "worklet";
      if (isEnabledSv.value === 0) {
        return;
      }
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
      if (didAddTouch) {
        scheduleOnRN(handleFingerHaptic);
        scheduleOnRN(playBubble);
      }
      updateStableCount(countVisibleTouches());
    })
    .onTouchesMove((event) => {
      "worklet";
      if (isEnabledSv.value === 0) {
        return;
      }
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
      if (isEnabledSv.value === 0) {
        return;
      }
      for (const touch of event.changedTouches) {
        const slot = findSlotByTouchId(touch.id);
        if (slot === -1) {
          continue;
        }
        if (isRevealedSv.value === 1) {
          slotTouchId[slot].value = -1;
        } else {
          slotTouchId[slot].value = -1;
          slotOpacity[slot].value = withTiming(0, { duration: 140 }, (done) => {
            if (done) {
              slotActive[slot].value = 0;
              slotScale[slot].value = 1;
            }
          });
        }
      }
      updateStableCount(countVisibleTouches());
      if (event.numberOfTouches === 0) {
        stateManager.end();
      }
    })
    .onTouchesCancelled((event, stateManager) => {
      "worklet";
      if (isEnabledSv.value === 0) {
        return;
      }
      for (let i = 0; i < MAX_SLOTS; i += 1) {
        if (isRevealedSv.value === 1) {
          slotTouchId[i].value = -1;
        } else {
          slotActive[i].value = 0;
          slotOpacity[i].value = 0;
          slotScale[i].value = 1;
          slotTouchId[i].value = -1;
        }
      }
      updateStableCount(0);
      if (isIosPhone) {
        scheduleOnRN(resetAllSlots);
      }
      stateManager.end();
    });

  const backButton = props.selectedTeams ? (
    <Button
      size="md"
      className={cn(
        "absolute top-16 left-6 z-10 rounded-full bg-[#0B0B0B]/50"
      )}
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
      <Button.Label>
        <Ionicons name="close" size={24} color="white" />
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
            shakePhase={shakePhase}
            shakeAmplitude={SHAKE_AMPLITUDE}
            baseColor="#0B0B0B"
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
