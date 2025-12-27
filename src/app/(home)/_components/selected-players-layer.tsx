import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { Button, cn } from "heroui-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  cancelAnimation,
  makeMutable,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type {
  SelectedPlayersLayerProps,
  TouchRect,
} from "../../../helpers/types/home-screen";
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

export default function SelectedPlayersLayer({
  selectedTeams,
  isDark,
  onBack,
  toggleRectSv,
  plusButtonRectSv,
  children,
}: SelectedPlayersLayerProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [slotRevealColors, setSlotRevealColors] = useState<string[]>(
    Array.from({ length: MAX_SLOTS }, () => "")
  );
  const [slotRevealLabels, setSlotRevealLabels] = useState<(string | null)[]>(
    Array.from({ length: MAX_SLOTS }, () => null)
  );
  const preRevealHapticsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const backRef = useRef<View>(null);
  const lastBubbleAtRef = useRef<number>(0);
  const bubblePlayer = useAudioPlayer(
    require("../../../../assets/audio/bubble.wav"),
    { keepAudioSessionActive: true, downloadFirst: true }
  );
  const isEnabledSv = useSharedValue(0);
  const isRevealedSv = useSharedValue(0);
  const stableCountSv = useSharedValue(0);
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
  const activeTeamColors = selectedTeams
    ? TEAM_COLORS.slice(0, selectedTeams)
    : [];
  const isIosPhone = Platform.OS === "ios" && !Platform.isPad;

  const assignTeams = (touchList: TouchPoint[]) => {
    const assignments: Record<string, string> = {};
    const numbers: Record<string, number> = {};
    if (activeTeamColors.length === 0) {
      return { assignments, numbers };
    }
    const baseOrder = (() => {
      const result = [...activeTeamColors];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    })();
    let colorPool = [...activeTeamColors];
    const usedColors = new Set<string>();

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
      usedColors.add(color);
    });

    const compactOrder = baseOrder.filter((color) => usedColors.has(color));
    const colorToNumber = compactOrder.reduce<Record<string, number>>(
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
      { offset: 2600, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 2300, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 2000, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 1600, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 1400, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 1200, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 1000, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 800, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 240, style: Haptics.ImpactFeedbackStyle.Heavy },
      { offset: 160, style: Haptics.ImpactFeedbackStyle.Heavy },
      { offset: 80, style: Haptics.ImpactFeedbackStyle.Heavy },
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

  const handleCountChange = (count: number) => {
    resetRevealState(false);
    if (count >= 2) {
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
      isPointInsideRect(x, y, toggleRectSv.value) ||
      isPointInsideRect(x, y, backRectSv.value) ||
      isPointInsideRect(x, y, plusButtonRectSv.value)
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

    scheduleOnRN(handleCountChange, count);
    if (count < 2) {
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
    if (count === stableCountSv.value) {
      return;
    }
    stableCountSv.value = count;
    startCountdown(count);
  };

  const handleBack = () => {
    onBack();
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
    isEnabledSv.value = selectedTeams ? 1 : 0;
    resetAllSlots();
    if (!selectedTeams) {
      plusButtonRectSv.value = {
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
  }, [selectedTeams, plusButtonRectSv, backRectSv, isEnabledSv]);

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

  return (
    <GestureDetector gesture={touchGesture}>
      <View className="flex-1">
        {children}
        {selectedTeams ? (
          <>
            <Button
              size="md"
              className={cn(
                "absolute top-16 left-6 z-10 rounded-full",
                isDark ? "bg-[#E4E4E4]/50" : "bg-[#0B0B0B]/50"
              )}
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
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#0b0b0b" : "white"}
                />
              </Button.Label>
            </Button>

            {slotActive.map((active, index) => {
              const revealColor =
                slotRevealColors[index] || (isDark ? "#E4E4E4" : "#0B0B0B");
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
                  baseColor={isDark ? "#E4E4E4" : "#0B0B0B"}
                  revealColor={revealColor}
                  isRevealed={isRevealed}
                  baseSize={BASE_CIRCLE_SIZE}
                  revealSize={REVEAL_CIRCLE_SIZE}
                  label={isRevealed && label ? label : undefined}
                />
              );
            })}
          </>
        ) : null}
      </View>
    </GestureDetector>
  );
}
