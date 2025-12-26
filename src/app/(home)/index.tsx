import { AppText } from "@/src/components/app-text";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
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
import { ThemeToggle } from "../../components/theme-toggle";
import { useAppTheme } from "../../contexts/app-theme-context";
import type { TouchPoint } from "../../helpers/types/touch-point";
import { PlayerCard } from "./player-card";
import SelectedPlayersLayer from "./selected-players-layer";

const BASE_CIRCLE_SIZE = 100;
const REVEAL_CIRCLE_SIZE = BASE_CIRCLE_SIZE * 1.5;
const HIGHLIGHT_DELAY_MS = 3000;
const TEAM_COLORS = ["#F64D00", "#1F3A5F", "#2FBF71", "#F2C14E", "#00A3E0"];
const GROUP_OPTIONS = [2, 3, 4, 5];
const IOS_MAX_TOUCHES = 5;
const MAX_SLOTS = 12;
const MAX_TOUCH_HINT_DURATION_MS = 1600;
const BUBBLE_THROTTLE_MS = 80;
const SHAKE_DURATION_MS = 800;
const SHAKE_STEP_MS = 30;
const SHAKE_CYCLES = Math.max(1, Math.floor(SHAKE_DURATION_MS / SHAKE_STEP_MS));

type TouchRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  isReady: boolean;
};

export default function App() {
  const { isDark } = useAppTheme();
  const [selectedGroups, setSelectedGroups] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [slotRevealColors, setSlotRevealColors] = useState<string[]>(
    Array.from({ length: MAX_SLOTS }, () => "")
  );
  const [slotRevealLabels, setSlotRevealLabels] = useState<(string | null)[]>(
    Array.from({ length: MAX_SLOTS }, () => null)
  );
  const [showMaxTouchHint, setShowMaxTouchHint] = useState(false);
  const preRevealHapticsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const toggleRef = useRef<View>(null);
  const backRef = useRef<View>(null);
  const maxTouchHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastBubbleAtRef = useRef<number>(0);
  const bubblePlayer = useAudioPlayer(
    require("../../../assets/audio/bubble.wav"),
    { keepAudioSessionActive: true, downloadFirst: true }
  );
  const isEnabledSv = useSharedValue(0);
  const isRevealedSv = useSharedValue(0);
  const stableCountSv = useSharedValue(0);
  const revealProgress = useSharedValue(0);
  const revealToken = useSharedValue(0);
  const shakePhase = useSharedValue(0.5);
  const toggleRectSv = useSharedValue<TouchRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isReady: false,
  });
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
  const activeTeamColors = selectedGroups
    ? TEAM_COLORS.slice(0, selectedGroups)
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
    setShowMaxTouchHint(false);
    clearMaxTouchHintTimer();
    stableCountSv.value = 0;
    revealToken.value += 1;
    for (let i = 0; i < MAX_SLOTS; i += 1) {
      slotActive[i].value = 0;
      slotOpacity[i].value = 0;
      slotScale[i].value = 1;
      slotTouchId[i].value = -1;
    }
  };

  const maybeShowMaxTouchHint = (count: number) => {
    if (Platform.OS !== "ios" || Platform.isPad) {
      return;
    }
    if (count !== IOS_MAX_TOUCHES) {
      return;
    }
    setShowMaxTouchHint(true);
    if (maxTouchHintTimerRef.current) {
      clearTimeout(maxTouchHintTimerRef.current);
    }
    maxTouchHintTimerRef.current = setTimeout(() => {
      setShowMaxTouchHint(false);
      maxTouchHintTimerRef.current = null;
    }, MAX_TOUCH_HINT_DURATION_MS);
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
    } else {
      setShowMaxTouchHint(false);
      clearMaxTouchHintTimer();
    }
    maybeShowMaxTouchHint(count);
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

  const clearMaxTouchHintTimer = () => {
    if (maxTouchHintTimerRef.current) {
      clearTimeout(maxTouchHintTimerRef.current);
      maxTouchHintTimerRef.current = null;
    }
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
      isPointInsideRect(x, y, backRectSv.value)
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

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    return () => {
      clearMaxTouchHintTimer();
      preRevealHapticsRef.current.forEach((timerId) => clearTimeout(timerId));
      preRevealHapticsRef.current = [];
    };
  }, []);

  useEffect(() => {
    isEnabledSv.value = selectedGroups ? 1 : 0;
    resetAllSlots();
  }, [selectedGroups]);

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
      <View className={cn("flex-1", isDark ? "bg-[#0B0B0B]" : "bg-[#E4E4E4]")}>
        {selectedGroups && showMaxTouchHint ? (
          <View className="absolute top-6 left-0 right-0 z-20 items-center pointer-events-none">
            <View
              className={cn(
                "px-4 py-2 rounded-full",
                isDark ? "bg-white/10" : "bg-black/10"
              )}
            >
              <AppText className={cn(isDark ? "text-white" : "text-black")}>
                Max 5 fingers on this device
              </AppText>
            </View>
          </View>
        ) : null}
        {!selectedGroups && (
          <View
            ref={toggleRef}
            className="absolute top-16 right-6 z-10 flex-row items-center gap-2 rounded-full"
            onLayout={() => {
              toggleRef.current?.measureInWindow((x, y, width, height) => {
                toggleRectSv.value = { x, y, width, height, isReady: true };
              });
            }}
          >
            <ThemeToggle />
          </View>
        )}

        <SelectedPlayersLayer
          selectedGroups={selectedGroups}
          isDark={isDark}
          slotX={slotX}
          slotY={slotY}
          slotActive={slotActive}
          slotOpacity={slotOpacity}
          slotScale={slotScale}
          shakePhase={shakePhase}
          slotRevealColors={slotRevealColors}
          slotRevealLabels={slotRevealLabels}
          isRevealed={isRevealed}
          baseSize={BASE_CIRCLE_SIZE}
          revealSize={REVEAL_CIRCLE_SIZE}
          backRef={backRef}
          onBack={() => {
            setSelectedGroups(null);
            resetAllSlots();
          }}
          onBackLayout={(rect) => {
            backRectSv.value = { ...rect, isReady: true };
          }}
        />

        {!selectedGroups && (
          <View className="flex-1 justify-center px-8 gap-4">
            <View className="w-full">
              <AppText className="text-xl font-semibold text-foreground mb-2">
                How many teams?
              </AppText>
              <View className="flex-row flex-wrap -mx-2">
                {GROUP_OPTIONS.map((count, index) => {
                  return (
                    <PlayerCard
                      key={count}
                      count={count}
                      index={index}
                      isDark={isDark}
                      isDisabled={false}
                      onPress={() => {
                        setSelectedGroups(count);
                      }}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    </GestureDetector>
  );
}
