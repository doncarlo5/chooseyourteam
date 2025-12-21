import { AppText } from "@/src/components/app-text";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { Button, Card, RadioGroup, cn } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  ZoomIn,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ThemeToggle } from "../../components/theme-toggle";
import { useAppTheme } from "../../contexts/app-theme-context";

const PRESS_ORANGE = "#F64D00";

type TouchPoint = {
  id: string;
  x: number;
  y: number;
};

const BASE_CIRCLE_SIZE = 100;
const REVEAL_CIRCLE_SIZE = BASE_CIRCLE_SIZE * 1.5;
const HIGHLIGHT_DELAY_MS = 4000;
const TEAM_COLORS = ["#F64D00", "#1F3A5F", "#2FBF71"];
const PLAYER_OPTIONS = [2, 3, 4, 5];

type DotProps = {
  x: number;
  y: number;
  baseColor: string;
  revealColor: string;
  isRevealed: boolean;
  baseSize: number;
  revealSize: number;
};

const Dot = ({
  x,
  y,
  baseColor,
  revealColor,
  isRevealed,
  baseSize,
  revealSize,
}: DotProps) => {
  const progress = useSharedValue(isRevealed ? 1 : 0);
  const size = useSharedValue(isRevealed ? revealSize : baseSize);

  useEffect(() => {
    progress.value = withTiming(isRevealed ? 1 : 0, { duration: 200 });
    size.value = withTiming(isRevealed ? revealSize : baseSize, {
      duration: 200,
    });
  }, [isRevealed, baseSize, revealSize, progress, size]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentSize = size.value;
    return {
      position: "absolute",
      left: x - currentSize / 2,
      top: y - currentSize / 2,
      width: currentSize,
      height: currentSize,
      borderRadius: currentSize / 2,
      borderWidth: 0,
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [baseColor, revealColor]
      ),
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [baseColor, revealColor]
      ),
    };
  });

  return (
    <Animated.View
      entering={ZoomIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={animatedStyle}
    />
  );
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PlayerCardProps = {
  count: number;
  index: number;
  isDark: boolean;
  isDisabled: boolean;
  onPress: () => void;
};

const PlayerCard = ({
  count,
  index,
  isDark,
  isDisabled,
  onPress,
}: PlayerCardProps) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.95]) }],
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    return {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 16,
      backgroundColor: PRESS_ORANGE,
      opacity: interpolate(pressed.value, [0, 1], [0, 0.3]),
    };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 100 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 150 });
      }}
      entering={FadeInDown.duration(300)
        .delay(index * 100)
        .easing(Easing.out(Easing.ease))}
      disabled={isDisabled}
      className="w-1/2 px-2 mb-4"
      style={animatedStyle}
    >
      <Card
        className={cn(
          "p-0 border rounded-2xl overflow-hidden",
          "border-zinc-200",
          isDark && "border-zinc-900",
          isDisabled && "opacity-50"
        )}
      >
        <Animated.View style={overlayStyle} />
        <Card.Body className="h-10" />
        <Card.Footer className="px-3 pb-4 flex-row items-end gap-4">
          <View className="flex-1">
            <Card.Title
              className={cn(
                "text-4xl font-extrabold ",
                isDark ? "text-white" : "text-[#0B0B0B]"
              )}
            >
              {count}
            </Card.Title>
            <Card.Description
              className={cn(
                "pl-0.5 leading-none",
                isDark ? "text-white" : "text-[#0B0B0B]"
              )}
            >
              players
            </Card.Description>
          </View>
        </Card.Footer>
      </Card>
    </AnimatedPressable>
  );
};

export default function App() {
  const { isDark } = useAppTheme();
  const [selectedPlayers, setSelectedPlayers] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState<"2" | "3">("2");
  const [touches, setTouches] = useState<TouchPoint[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState<
    Record<string, string>
  >({});
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
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleRef = useRef<View>(null);
  const backRef = useRef<View>(null);
  const stableCountRef = useRef<number>(0);
  const touchSignatureRef = useRef<string>("");
  const prevTouchIdsRef = useRef<Set<string>>(new Set());
  const activeTeamColors =
    teamCount === "2" ? TEAM_COLORS.slice(0, 2) : TEAM_COLORS;

  const assignTeams = (touchList: TouchPoint[]) => {
    const assignments: Record<string, string> = {};
    if (activeTeamColors.length === 0) {
      return assignments;
    }
    let colorPool = [...activeTeamColors];

    const shuffle = (values: string[]) => {
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
      assignments[touch.id] = colorPool[index % activeTeamColors.length];
    });

    return assignments;
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
    setRevealedTouches([]);
    setFrozenTouches([]);
    prevTouchIdsRef.current = new Set();
    if (highlightTimer.current) {
      clearTimeout(highlightTimer.current);
      highlightTimer.current = null;
    }
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
  };

  const updateTouches = (nextTouches: TouchPoint[]) => {
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

    const currentIds = new Set(visibleTouches.map((touch) => touch.id));
    const hasNewTouch = visibleTouches.some(
      (touch) => !prevTouchIdsRef.current.has(touch.id)
    );
    if (hasNewTouch) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    prevTouchIdsRef.current = currentIds;

    if (isRevealed) {
      if (visibleTouches.length > 0) {
        setRevealedTouches((prevTouches) => {
          const nextTouches = [...prevTouches];
          visibleTouches.forEach((touch) => {
            const existingIndex = nextTouches.findIndex(
              (item) => item.id === touch.id
            );
            if (existingIndex === -1) {
              nextTouches.push(touch);
            } else {
              nextTouches[existingIndex] = touch;
            }
          });
          return nextTouches;
        });
        if (releaseTimerRef.current) {
          clearTimeout(releaseTimerRef.current);
          releaseTimerRef.current = null;
        }
      } else if (revealedTouches.length > 0 && !releaseTimerRef.current) {
        setFrozenTouches(revealedTouches);
        releaseTimerRef.current = setTimeout(() => {
          setFrozenTouches([]);
          setRevealedTouches([]);
          setIsRevealed(false);
          setTeamAssignments({});
        }, HIGHLIGHT_DELAY_MS);
      }
      return;
    }

    const currentCount = visibleTouches.length;
    const signature = visibleTouches
      .map((touch) => touch.id)
      .sort()
      .join("|");
    if (filteredTouches.length !== selectedPlayers) {
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
        highlightTimer.current = setTimeout(() => {
          if (stableCountRef.current === currentCount) {
            setTeamAssignments(assignTeams(visibleTouches));
            setIsRevealed(true);
            setRevealedTouches(visibleTouches);
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
        highlightTimer.current = setTimeout(() => {
          if (stableCountRef.current === currentCount) {
            setTeamAssignments(assignTeams(visibleTouches));
            setIsRevealed(true);
            setRevealedTouches(visibleTouches);
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
        updateTouches(nextTouches);
      }}
      onTouchMove={(event) => {
        const nextTouches = event.nativeEvent.touches.map((touch) => ({
          id: touch.identifier,
          x: touch.pageX,
          y: touch.pageY,
        }));
        updateTouches(nextTouches);
      }}
      onTouchEnd={(event) => {
        const nextTouches = event.nativeEvent.touches.map((touch) => ({
          id: touch.identifier,
          x: touch.pageX,
          y: touch.pageY,
        }));
        updateTouches(nextTouches);
      }}
      onTouchCancel={(event) => {
        const nextTouches = event.nativeEvent.touches.map((touch) => ({
          id: touch.identifier,
          x: touch.pageX,
          y: touch.pageY,
        }));
        updateTouches(nextTouches);
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

      {selectedPlayers && (
        <Button
          onPress={() => {
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
          size="sm"
          className={cn(
            "absolute top-16 left-6 z-10 p-2 rounded-full",
            isDark ? "bg-[#E4E4E4]" : "bg-[#0B0B0B]"
          )}
          onLayout={() => {
            backRef.current?.measureInWindow((x, y, width, height) => {
              setBackRect({ x, y, width, height });
            });
          }}
          ref={backRef}
        >
          <Button.Label
            className={cn(
              "text-sm font-semibold",
              isDark ? "text-[#0B0B0B]" : "text-[#E4E4E4]"
            )}
          >
            <Ionicons
              name="close"
              size={20}
              color={isDark ? "#0b0b0b" : "white"}
            />
          </Button.Label>
        </Button>
      )}

      {(frozenTouches.length > 0
        ? frozenTouches
        : isRevealed
          ? revealedTouches
          : touches
      ).map((touch) => {
        const baseColor = isDark ? "#E4E4E4" : "#0B0B0B";
        const revealColor = teamAssignments[touch.id] ?? baseColor;
        return (
          <Dot
            key={touch.id}
            x={touch.x}
            y={touch.y}
            baseColor={baseColor}
            revealColor={revealColor}
            isRevealed={isRevealed || frozenTouches.length > 0}
            baseSize={BASE_CIRCLE_SIZE}
            revealSize={REVEAL_CIRCLE_SIZE}
          />
        );
      })}

      {!selectedPlayers && (
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <RadioGroup
            value={teamCount}
            onValueChange={(value) => setTeamCount(value as "2" | "3")}
            className="flex-row items-center gap-6 mb-6"
          >
            <RadioGroup.Item value="2" className="flex-row items-center gap-2">
              <RadioGroup.Indicator
                className={cn(
                  "border-2",
                  teamCount === "2"
                    ? "border-accent bg-accent"
                    : "border-foreground"
                )}
              />
              <RadioGroup.Label
                className={cn(
                  teamCount === "2" ? "text-accent" : "text-foreground"
                )}
              >
                2 teams
              </RadioGroup.Label>
            </RadioGroup.Item>
            <RadioGroup.Item value="3" className="flex-row items-center gap-2">
              <RadioGroup.Indicator
                className={cn(
                  "border-2",
                  teamCount === "3"
                    ? "border-accent bg-accent"
                    : "border-foreground"
                )}
              />
              <RadioGroup.Label
                className={cn(
                  teamCount === "3" ? "text-accent" : "text-foreground"
                )}
              >
                3 teams
              </RadioGroup.Label>
            </RadioGroup.Item>
          </RadioGroup>
          <AppText className="text-xl font-semibold text-foreground">
            How many players are you?
          </AppText>
          <View className="w-full">
            <View className="flex-row flex-wrap -mx-2">
              {PLAYER_OPTIONS.map((count, index) => {
                const isDisabled = teamCount === "3" && count === 2;
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
