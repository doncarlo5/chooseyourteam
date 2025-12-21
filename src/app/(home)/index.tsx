import { StatusBar } from "expo-status-bar";
import { Button, RadioGroup, cn, useThemeColor } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { AppText } from "../../components/app-text";
import { ThemeToggle } from "../../components/theme-toggle";
import { useAppTheme } from "../../contexts/app-theme-context";

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

export default function App() {
  const { isDark } = useAppTheme();
  const themeColorAccent = useThemeColor("accent");
  const themeColorAccentForeground = useThemeColor("accent-foreground");
  const themeColorForeground = useThemeColor("foreground");
  const [selectedPlayers, setSelectedPlayers] = useState<number | null>(null);
  const [teamCount, setTeamCount] = useState<"2" | "3">("2");
  const [touches, setTouches] = useState<TouchPoint[]>([]);
  const [isRevealed, setIsRevealed] = useState(false);
  const [teamAssignments, setTeamAssignments] = useState<
    Record<string, string>
  >({});
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
  const toggleRef = useRef<View>(null);
  const backRef = useRef<View>(null);
  const stableCountRef = useRef<number>(0);
  const touchSignatureRef = useRef<string>("");
  const activeTeamColors =
    teamCount === "2" ? TEAM_COLORS.slice(0, 2) : TEAM_COLORS;

  const isTouchInsideRect = (
    touch: TouchPoint,
    rect: { x: number; y: number; width: number; height: number } | null,
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
    if (highlightTimer.current) {
      clearTimeout(highlightTimer.current);
      highlightTimer.current = null;
    }
  };

  const updateTouches = (nextTouches: TouchPoint[]) => {
    if (!selectedPlayers) {
      return;
    }
    const filteredTouches = nextTouches.filter(
      (touch) =>
        !isTouchInsideRect(touch, toggleRect) &&
        !isTouchInsideRect(touch, backRect),
    );
    const visibleTouches = filteredTouches.slice(0, selectedPlayers);
    setTouches(visibleTouches);

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
            const assignments: Record<string, string> = {};
            visibleTouches.forEach((touch, index) => {
              assignments[touch.id] =
                activeTeamColors[index % activeTeamColors.length];
            });
            setTeamAssignments(assignments);
            setIsRevealed(true);
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
            const assignments: Record<string, string> = {};
            visibleTouches.forEach((touch, index) => {
              assignments[touch.id] =
                activeTeamColors[index % activeTeamColors.length];
            });
            setTeamAssignments(assignments);
            setIsRevealed(true);
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
      className="flex-1"
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
      style={{ backgroundColor: isDark ? "#0B0B0B" : "#E4E4E4" }}
    >
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
          className="absolute top-16 left-6 z-10 rounded-full"
          style={{
            backgroundColor: isDark ? "#E4E4E4" : "#0B0B0B",
          }}
          onLayout={() => {
            backRef.current?.measureInWindow((x, y, width, height) => {
              setBackRect({ x, y, width, height });
            });
          }}
          ref={backRef}
        >
          <Button.Label
            className="text-sm font-semibold"
            style={{ color: isDark ? "#0B0B0B" : "#E4E4E4" }}
          >
            Back
          </Button.Label>
        </Button>
      )}

      {touches.map((touch) => {
        const baseColor = isDark ? "#E4E4E4" : "#0B0B0B";
        const circleColor = isRevealed
          ? (teamAssignments[touch.id] ?? baseColor)
          : baseColor;
        const circleSize = isRevealed ? REVEAL_CIRCLE_SIZE : BASE_CIRCLE_SIZE;
        return (
          <View
            key={touch.id}
            style={{
              position: "absolute",
              left: touch.x - circleSize / 2,
              top: touch.y - circleSize / 2,
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderWidth: 0,
              borderColor: circleColor,
              backgroundColor: circleColor,
            }}
          />
        );
      })}

      {!selectedPlayers && (
        <View className="flex-1 items-center justify-center px-8">
          <RadioGroup
            value={teamCount}
            onValueChange={(value) => setTeamCount(value as "2" | "3")}
            className="flex-row items-center gap-6 mb-6"
          >
            <RadioGroup.Item value="2" className="flex-row items-center gap-2">
              <RadioGroup.Indicator
                className="border-2"
                style={{
                  borderColor:
                    teamCount === "2" ? themeColorAccent : themeColorForeground,
                  backgroundColor:
                    teamCount === "2" ? themeColorAccent : "transparent",
                }}
              />
              <RadioGroup.Label
                style={{
                  color:
                    teamCount === "2" ? themeColorAccent : themeColorForeground,
                }}
              >
                2 teams
              </RadioGroup.Label>
            </RadioGroup.Item>
            <RadioGroup.Item value="3" className="flex-row items-center gap-2">
              <RadioGroup.Indicator
                className="border-2"
                style={{
                  borderColor:
                    teamCount === "3" ? themeColorAccent : themeColorForeground,
                  backgroundColor:
                    teamCount === "3" ? themeColorAccent : "transparent",
                }}
              />
              <RadioGroup.Label
                style={{
                  color:
                    teamCount === "3" ? themeColorAccent : themeColorForeground,
                }}
              >
                3 teams
              </RadioGroup.Label>
            </RadioGroup.Item>
          </RadioGroup>
          <AppText className="text-lg font-semibold text-foreground mb-6">
            Choose players
          </AppText>
          <View className="w-full">
            <View className="flex-row gap-4 mb-4">
              {PLAYER_OPTIONS.slice(0, 2).map((count) => {
                const isSelected = selectedPlayers === count;
                return (
                  <Button
                    key={count}
                    size="sm"
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
                    isDisabled={teamCount === "3" && count === 2}
                    className={cn(
                      "flex-1 h-20 rounded-2xl border shadow-md shadow-black/5",
                      "border-neutral-200",
                    )}
                    style={{
                      backgroundColor:
                        teamCount === "3" && count === 2
                          ? "#D4D4D4"
                          : isSelected
                            ? themeColorAccent
                            : "#E4E4E4",
                    }}
                  >
                    <Button.Label
                      className="text-base font-semibold"
                      style={{
                        color:
                          teamCount === "3" && count === 2
                            ? "#8A8A8A"
                            : isSelected
                              ? themeColorAccentForeground
                              : "#0B0B0B",
                      }}
                    >
                      {count} players
                    </Button.Label>
                  </Button>
                );
              })}
            </View>
            <View className="flex-row gap-4">
              {PLAYER_OPTIONS.slice(2).map((count) => {
                const isSelected = selectedPlayers === count;
                return (
                  <Button
                    key={count}
                    size="sm"
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
                    className={cn(
                      "flex-1 h-20 rounded-2xl border shadow-md shadow-black/5",
                      "border-neutral-200",
                    )}
                    style={{
                      backgroundColor: isSelected
                        ? themeColorAccent
                        : "#E4E4E4",
                    }}
                  >
                    <Button.Label
                      className="text-base font-semibold"
                      style={{
                        color: isSelected
                          ? themeColorAccentForeground
                          : "#0B0B0B",
                      }}
                    >
                      {count} players
                    </Button.Label>
                  </Button>
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
