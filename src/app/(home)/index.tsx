import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ThemeToggle } from "../../components/theme-toggle";
import { useAppTheme } from "../../contexts/app-theme-context";

type TouchPoint = {
  id: string;
  x: number;
  y: number;
};

const BASE_CIRCLE_SIZE = 50;
const CIRCLE_SIZE = BASE_CIRCLE_SIZE * 1.5;
const WINNER_CIRCLE_SIZE = BASE_CIRCLE_SIZE * 2;
const HIGHLIGHT_DELAY_MS = 5000;
const BASE_CIRCLE_COLOR = "#F64D00";
const HIGHLIGHT_CIRCLE_COLOR = "#E4E4E4";

export default function App() {
  const { isDark } = useAppTheme();
  const [touches, setTouches] = useState<TouchPoint[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [toggleRect, setToggleRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleRef = useRef<View>(null);
  const stableCountRef = useRef<number>(0);

  const isTouchOnToggle = useCallback(
    (touch: TouchPoint) => {
      if (!toggleRect) {
        return false;
      }
      return (
        touch.x >= toggleRect.x &&
        touch.x <= toggleRect.x + toggleRect.width &&
        touch.y >= toggleRect.y &&
        touch.y <= toggleRect.y + toggleRect.height
      );
    },
    [toggleRect]
  );

  const updateTouches = useCallback(
    (nextTouches: TouchPoint[]) => {
      const filteredTouches = nextTouches.filter(
        (touch) => !isTouchOnToggle(touch)
      );
      setTouches(filteredTouches);

      const currentCount = filteredTouches.length;
      if (currentCount !== stableCountRef.current) {
        stableCountRef.current = currentCount;
        setHighlightId(null);
        if (highlightTimer.current) {
          clearTimeout(highlightTimer.current);
          highlightTimer.current = null;
        }
        if (currentCount > 0) {
          const randomIndex = Math.floor(
            Math.random() * filteredTouches.length
          );
          const scheduledId = filteredTouches[randomIndex]?.id ?? null;
          highlightTimer.current = setTimeout(() => {
            if (stableCountRef.current === currentCount) {
              setHighlightId(scheduledId);
            }
          }, HIGHLIGHT_DELAY_MS);
        }
        return;
      }

      if (highlightId) {
        const hasHighlight = filteredTouches.some(
          (touch) => touch.id === highlightId
        );
        if (!hasHighlight) {
          setHighlightId(null);
        }
      }
    },
    [highlightId, isTouchOnToggle]
  );

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
        className="absolute top-16 right-6 z-10 rounded-full"
        onLayout={() => {
          toggleRef.current?.measureInWindow((x, y, width, height) => {
            setToggleRect({ x, y, width, height });
          });
        }}
      >
        <ThemeToggle />
      </View>

      {touches.map((touch) => {
        const isHighlighted = touch.id === highlightId;
        const circleColor = isHighlighted
          ? HIGHLIGHT_CIRCLE_COLOR
          : BASE_CIRCLE_COLOR;
        const circleSize = isHighlighted ? WINNER_CIRCLE_SIZE : CIRCLE_SIZE;
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

      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}
