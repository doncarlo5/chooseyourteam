import { AppText } from "@/src/components/app-text";
import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import {
  Card,
  Divider,
  PressableFeedback,
  Select,
  cn,
  useSelectAnimation,
  useThemeColor,
} from "heroui-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { ThemeToggle } from "../../components/theme-toggle";
import { useAppTheme } from "../../contexts/app-theme-context";
import type { PlayerCardProps } from "../../helpers/types/home-screen";
import type { TouchPoint } from "../../helpers/types/touch-point";
import SelectedPlayersLayer from "./selected-players-layer";

const StyledFeather = withUniwind(Feather);

const BASE_CIRCLE_SIZE = 100;
const REVEAL_CIRCLE_SIZE = BASE_CIRCLE_SIZE * 1.5;
const HIGHLIGHT_DELAY_MS = 4000;
const TEAM_COLORS = ["#F64D00", "#1F3A5F", "#2FBF71"];
const PLAYER_OPTIONS = [2, 3, 4, 5];

export default function App() {
  const { isDark } = useAppTheme();
  const [selectedPlayers, setSelectedPlayers] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState({ value: "2", label: "2 teams" });
  const [touches, setTouches] = useState<TouchPoint[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState<
    Record<string, string>
  >({});
  const [teamNumbers, setTeamNumbers] = useState<Record<string, number>>({});
  const [revealedTouches, setRevealedTouches] = useState<TouchPoint[]>([]);
  const [frozenTouches, setFrozenTouches] = useState<TouchPoint[]>([]);
  const [toggleRect, setToggleRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [backRect, setBackRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preRevealHapticsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const toggleRef = useRef<View>(null);
  const backRef = useRef<View>(null);
  const stableCountRef = useRef<number>(0);
  const touchSignatureRef = useRef<string>("");
  const prevTouchIdsRef = useRef<Set<string>>(new Set());
  const latestTouchesRef = useRef<TouchPoint[]>([]);
  const activeTeamColors =
    teamCount.value === "2" ? TEAM_COLORS.slice(0, 2) : TEAM_COLORS;

  const assignTeams = (touchList: TouchPoint[]) => {
    const assignments: Record<string, string> = {};
    const numbers: Record<string, number> = {};
    if (activeTeamColors.length === 0) {
      return { assignments, numbers };
    }
    let colorPool = [...activeTeamColors];
    const teamIndexPool = activeTeamColors.map((_, index) => index + 1);
    let numberPool = [...teamIndexPool];

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
        numberPool = shuffle(teamIndexPool);
      }
      const poolIndex = index % activeTeamColors.length;
      assignments[touch.id] = colorPool[poolIndex];
      numbers[touch.id] = numberPool[poolIndex];
    });

    return { assignments, numbers };
  };

  const isTouchInsideRect = (
    touch: TouchPoint,
    rect: { x: number; y: number; width: number; height: number } | null
  ) => {
    if (!rect) {
      return false;
    }
    return (
      touch.x >= rect.x &&
      touch.x <= rect.x + rect.width &&
      touch.y >= rect.y &&
      touch.y <= rect.y + rect.height
    );
  };

  const resetReveal = () => {
    setIsRevealed(false);
    setTeamAssignments({});
    setTeamNumbers({});
    setRevealedTouches([]);
    setFrozenTouches([]);
    prevTouchIdsRef.current = new Set();
    if (highlightTimer.current) {
      clearTimeout(highlightTimer.current);
      highlightTimer.current = null;
    }
    preRevealHapticsRef.current.forEach((timerId) => clearTimeout(timerId));
    preRevealHapticsRef.current = [];
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
      { offset: 1600, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 1300, style: Haptics.ImpactFeedbackStyle.Light },
      { offset: 1000, style: Haptics.ImpactFeedbackStyle.Medium },
      { offset: 800, style: Haptics.ImpactFeedbackStyle.Medium },
      { offset: 600, style: Haptics.ImpactFeedbackStyle.Medium },
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

  const updateTouches = (nextTouches: TouchPoint[], isTouchStart: boolean) => {
    if (!selectedPlayers) {
      return;
    }
    if (frozenTouches.length > 0) {
      return;
    }
    const filteredTouches = nextTouches.filter(
      (touch) =>
        !isTouchInsideRect(touch, toggleRect) &&
        !isTouchInsideRect(touch, backRect)
    );
    const visibleTouches = filteredTouches.slice(0, selectedPlayers);
    setTouches(visibleTouches);
    latestTouchesRef.current = visibleTouches;

    if (isRevealed) {
      if (visibleTouches.length === 0) {
        setFrozenTouches(revealedTouches);
        return;
      }

      setRevealedTouches((prevTouches) =>
        prevTouches.map((touch) => {
          const updated = visibleTouches.find((item) => item.id === touch.id);
          return updated ?? touch;
        })
      );
      return;
    }

    const currentIds = new Set(visibleTouches.map((touch) => touch.id));
    const hasNewTouch = visibleTouches.some(
      (touch) => !prevTouchIdsRef.current.has(touch.id)
    );
    if (isTouchStart && hasNewTouch) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prevTouchIdsRef.current = currentIds;
    if (nextTouches.length === 0) {
      prevTouchIdsRef.current = new Set();
    }

    const currentCount = visibleTouches.length;
    const signature = visibleTouches
      .map((touch) => touch.id)
      .sort()
      .join("|");
    if (visibleTouches.length !== selectedPlayers) {
      stableCountRef.current = currentCount;
      touchSignatureRef.current = signature;
      resetReveal();
      return;
    }
    if (signature !== touchSignatureRef.current) {
      touchSignatureRef.current = signature;
      stableCountRef.current = currentCount;
      resetReveal();
      if (currentCount > 0) {
        schedulePreRevealHaptics(HIGHLIGHT_DELAY_MS, 2000);
        highlightTimer.current = setTimeout(() => {
          if (stableCountRef.current === currentCount) {
            const latestTouches = latestTouchesRef.current;
            const { assignments, numbers } = assignTeams(latestTouches);
            setTeamAssignments(assignments);
            setTeamNumbers(numbers);
            setIsRevealed(true);
            setRevealedTouches(latestTouches);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }, HIGHLIGHT_DELAY_MS);
      }
      return;
    }
    if (currentCount !== stableCountRef.current) {
      stableCountRef.current = currentCount;
      resetReveal();
      if (currentCount > 0) {
        schedulePreRevealHaptics(HIGHLIGHT_DELAY_MS, 2000);
        highlightTimer.current = setTimeout(() => {
          if (stableCountRef.current === currentCount) {
            const latestTouches = latestTouchesRef.current;
            const { assignments, numbers } = assignTeams(latestTouches);
            setTeamAssignments(assignments);
            setTeamNumbers(numbers);
            setIsRevealed(true);
            setRevealedTouches(latestTouches);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }, HIGHLIGHT_DELAY_MS);
      }
      return;
    }
  };

  useEffect(() => {
    return () => {
      if (highlightTimer.current) {
        clearTimeout(highlightTimer.current);
      }
    };
  }, []);

  return (
    <View
      onTouchStart={(event) => {
        const nextTouches = event.nativeEvent.touches.map((touch) => ({
          id: touch.identifier,
          x: touch.pageX,
          y: touch.pageY,
        }));
        updateTouches(nextTouches, true);
      }}
      onTouchMove={(event) => {
        const nextTouches = event.nativeEvent.touches.map((touch) => ({
          id: touch.identifier,
          x: touch.pageX,
          y: touch.pageY,
        }));
        updateTouches(nextTouches, false);
      }}
      onTouchEnd={(event) => {
        const nextTouches = event.nativeEvent.touches.map((touch) => ({
          id: touch.identifier,
          x: touch.pageX,
          y: touch.pageY,
        }));
        updateTouches(nextTouches, false);
      }}
      onTouchCancel={(event) => {
        const nextTouches = event.nativeEvent.touches.map((touch) => ({
          id: touch.identifier,
          x: touch.pageX,
          y: touch.pageY,
        }));
        updateTouches(nextTouches, false);
      }}
      className={cn("flex-1", isDark ? "bg-[#0B0B0B]" : "bg-[#E4E4E4]")}
    >
      {!selectedPlayers && (
        <View
          ref={toggleRef}
          className="absolute top-16 right-6 z-10 flex-row items-center gap-2 rounded-full"
          onLayout={() => {
            toggleRef.current?.measureInWindow((x, y, width, height) => {
              setToggleRect({ x, y, width, height });
            });
          }}
        >
          <ThemeToggle />
        </View>
      )}

      <SelectedPlayersLayer
        selectedPlayers={selectedPlayers}
        isDark={isDark}
        touches={touches}
        revealedTouches={revealedTouches}
        frozenTouches={frozenTouches}
        isRevealed={isRevealed}
        teamAssignments={teamAssignments}
        teamNumbers={teamNumbers}
        baseSize={BASE_CIRCLE_SIZE}
        revealSize={REVEAL_CIRCLE_SIZE}
        backRef={backRef}
        onBack={() => {
          setSelectedPlayers(null);
          setTouches([]);
          resetReveal();
          stableCountRef.current = 0;
          touchSignatureRef.current = "";
          if (highlightTimer.current) {
            clearTimeout(highlightTimer.current);
            highlightTimer.current = null;
          }
        }}
        onBackLayout={(rect) => {
          setBackRect(rect);
        }}
      />

      {!selectedPlayers && (
        <View className="flex-1 justify-center px-8 gap-4">
          <View className="w-full">
            <AppText className="text-xl font-semibold text-foreground mb-2">
              How many teams?
            </AppText>
            <Select
              value={teamCount}
              onValueChange={(option) => option && setTeamCount(option)}
            >
              <Select.Trigger>
                <TeamSelectTrigger />
              </Select.Trigger>
              <Select.Portal>
                <Select.Overlay />
                <Select.Content width="trigger">
                  <Select.ListLabel className="mb-2">
                    Split group into
                  </Select.ListLabel>
                  <Select.Item value="2" label="2 teams" />
                  <Divider />
                  <Select.Item value="3" label="3 teams" />
                </Select.Content>
              </Select.Portal>
            </Select>
          </View>
          <AppText className="text-xl font-semibold text-foreground">
            How many players?
          </AppText>
          <View className="w-full">
            <View className="flex-row flex-wrap -mx-2">
              {PLAYER_OPTIONS.map((count, index) => {
                const isDisabled = teamCount.value === "3" && count === 2;
                return (
                  <PlayerCard
                    key={count}
                    count={count}
                    index={index}
                    isDark={isDark}
                    isDisabled={isDisabled}
                    onPress={() => {
                      setTouches([]);
                      resetReveal();
                      stableCountRef.current = 0;
                      touchSignatureRef.current = "";
                      if (highlightTimer.current) {
                        clearTimeout(highlightTimer.current);
                        highlightTimer.current = null;
                      }
                      setSelectedPlayers(count);
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
  );
}

function PlayerCard({
  count,
  index,
  isDark,
  isDisabled,
  onPress,
}: PlayerCardProps) {
  const themeColorAccent = useThemeColor("accent");

  return (
    <Animated.View
      entering={FadeInDown.duration(300)
        .delay(index * 100)
        .easing(Easing.out(Easing.ease))}
      className="w-1/2 px-2 mb-4"
      collapsable={false}
    >
      <PressableFeedback
        onPress={onPress}
        isDisabled={isDisabled}
        feedbackVariant="ripple"
        className="w-full rounded-3xl"
        animation={{
          ripple: {
            backgroundColor: { value: themeColorAccent },
            opacity: { value: [0, 0.2, 0] },
            progress: { baseDuration: 600 },
          },
        }}
      >
        <Card
          className={cn(
            "p-0 rounded-3xl overflow-hidden shadow-sm shadow-black/10",
            isDisabled && "opacity-50"
          )}
        >
          <Card.Body className="h-10" />
          <Card.Footer className="px-3 pb-4 flex-row items-end gap-4">
            <View className="flex-1">
              <Card.Title
                className={cn(
                  "text-5xl font-extrabold ",
                  isDark ? "text-white" : "text-[#0B0B0B]"
                )}
              >
                {count}
              </Card.Title>
              <Card.Description className="pl-0.5 leading-none text-muted">
                players
              </Card.Description>
            </View>
          </Card.Footer>
        </Card>
      </PressableFeedback>
    </Animated.View>
  );
}

function TeamSelectTrigger() {
  const { progress } = useSelectAnimation();
  const themeColorAccent = useThemeColor("accent");

  const borderStyle = useMemo(
    () => ({
      position: "absolute" as const,
      top: -4,
      bottom: -4,
      left: -4,
      right: -4,
      borderWidth: 2.5,
      borderColor: themeColorAccent,
      borderRadius: 18,
    }),
    [themeColorAccent]
  );

  const rBorderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1, 2], [0, 1, 0]);
    return { opacity };
  });

  const rChevronStyle = useAnimatedStyle(() => {
    const rotate = interpolate(progress.value, [0, 1, 2], [0, -180, 0]);
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  return (
    <View className="relative bg-surface h-[48px] w-full px-3 rounded-2xl justify-center shadow-md shadow-black/5">
      <Animated.View style={[borderStyle, rBorderStyle]} pointerEvents="none" />
      <Select.Value placeholder="Select teams" />
      <View className="absolute right-3">
        <Animated.View style={rChevronStyle}>
          <StyledFeather name="chevron-down" size={18} className="text-muted" />
        </Animated.View>
      </View>
    </View>
  );
}
