import { PaginationIndicator } from "@/src/components/component-presentation/pagination-indicator";
import type { AllocationRound } from "@/src/screens/state/allocation-session-state";
import { Ionicons } from "@expo/vector-icons";
import { cn } from "heroui-native";
import { useEffect, useRef, type ReactNode } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  canNavigateRounds,
  didDragSettleWithoutMomentum,
  roundForSettledOffset,
} from "../round-navigation";
import RoundScreen from "./round-screen";

export default function AllocationRoundNavigation(props: {
  isMultiRound: boolean;
  currentRound: AllocationRound;
  firstRoundCount: number;
  secondRoundCount: number;
  touchCount: number;
  isTouching: boolean;
  isRoundOneFrozen: boolean;
  isRoundTwoFrozen: boolean;
  hasShownSwipeHint: boolean;
  resetKey: number;
  onSwipeHintSeen: () => void;
  onNavigationStarted: () => void;
  onNavigationCancelled: () => void;
  onNavigationSettled: (round: AllocationRound) => void;
  children: (
    roundScrollX: SharedValue<number>,
    navigationLayer: ReactNode,
  ) => ReactNode;
}) {
  const { width } = useWindowDimensions();
  const roundScrollX = useSharedValue(0);
  const hasCrossedThreshold = useSharedValue(false);
  const arrowBounce = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);
  const handleSwipeHintSeen = () => props.onSwipeHintSeen();
  const scrollHandler = useAnimatedScrollHandler((event) => {
    roundScrollX.set(event.contentOffset.x);
    if (event.contentOffset.x >= width * 0.5 && !hasCrossedThreshold.get()) {
      hasCrossedThreshold.set(true);
      scheduleOnRN(handleSwipeHintSeen);
    }
  });
  const rightArrowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      roundScrollX.get(),
      [0, width * 0.5, width],
      [1, 0.5, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      { translateX: interpolate(arrowBounce.get(), [0, 1], [0, 12]) },
    ],
  }));
  const leftArrowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      roundScrollX.get(),
      [0, width * 0.5, width],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      { translateX: interpolate(arrowBounce.get(), [0, 1], [0, -12]) },
    ],
  }));

  useEffect(() => {
    arrowBounce.set(
      withRepeat(
        withTiming(1, {
          duration: 700,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      ),
    );
  }, [arrowBounce]);

  useEffect(() => {
    roundScrollX.set(0);
    hasCrossedThreshold.set(false);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [hasCrossedThreshold, props.resetKey, roundScrollX]);

  const navigationLayer = (
    <>
      {props.isMultiRound ? (
        <>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={canNavigateRounds(
              props.isRoundOneFrozen,
              props.isTouching,
            )}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            onScrollBeginDrag={props.onNavigationStarted}
            onScrollEndDrag={(event) => {
              if (didDragSettleWithoutMomentum(event.nativeEvent.velocity?.x)) {
                props.onNavigationCancelled();
                props.onNavigationSettled(
                  roundForSettledOffset(
                    event.nativeEvent.contentOffset.x,
                    width,
                  ),
                );
              }
            }}
            onMomentumScrollEnd={(event) => {
              props.onNavigationSettled(
                roundForSettledOffset(event.nativeEvent.contentOffset.x, width),
              );
            }}
          >
            <View style={{ width }}>
              <RoundScreen
                fingersCount={props.firstRoundCount}
                touchCount={props.touchCount}
                isActive={props.currentRound === 0}
                isFrozen={props.isRoundOneFrozen}
                allowOverExpected={false}
              />
            </View>
            <View style={{ width }}>
              <RoundScreen
                fingersCount={props.secondRoundCount}
                touchCount={props.touchCount}
                isActive={props.currentRound === 1}
                isFrozen={props.isRoundTwoFrozen}
                allowOverExpected={false}
              />
            </View>
          </Animated.ScrollView>
          <View
            className={cn("absolute left-0 right-0 items-center")}
            style={{ bottom: 40 }}
          >
            <View className={cn("flex-row items-center gap-2")}>
              {[0, 1].map((index) => (
                <PaginationIndicator
                  key={index}
                  index={index}
                  scrollX={roundScrollX}
                  itemSize={width}
                />
              ))}
            </View>
          </View>
          {props.currentRound === 0 &&
          props.isRoundOneFrozen &&
          !props.hasShownSwipeHint ? (
            <View
              className={cn(
                "absolute right-8 inset-y-0 items-center justify-center",
              )}
            >
              <Animated.View style={rightArrowStyle}>
                <Ionicons
                  name="chevron-forward-outline"
                  size={34}
                  color="#0B0B0B"
                />
              </Animated.View>
            </View>
          ) : null}
          {props.currentRound === 1 && props.isRoundTwoFrozen ? (
            <View
              className={cn(
                "absolute left-8 inset-y-0 items-center justify-center",
              )}
            >
              <Animated.View style={leftArrowStyle}>
                <Ionicons
                  name="chevron-back-outline"
                  size={34}
                  color="#0B0B0B"
                />
              </Animated.View>
            </View>
          ) : null}
        </>
      ) : (
        <View className={cn("absolute inset-0")} pointerEvents="none">
          <RoundScreen
            fingersCount={props.firstRoundCount}
            touchCount={props.touchCount}
            isActive
            isFrozen={props.isRoundOneFrozen}
            allowOverExpected
          />
        </View>
      )}
    </>
  );

  return props.children(roundScrollX, navigationLayer);
}
