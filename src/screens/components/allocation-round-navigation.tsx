import { PaginationIndicator } from "@/src/components/component-presentation/pagination-indicator";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
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
  createRoundNavigationReset,
  didDragSettleWithoutMomentum,
  shouldEmitRoundSwipeThreshold,
  settleRoundNavigation,
} from "../round-navigation";
import RoundScreen from "./round-screen";

export default function AllocationRoundNavigation(props: {
  state: {
    isMultiRound: boolean;
    currentRound: AllocationRound;
    playerCounts: {
      firstRound: number;
      secondRound: number;
      touching: number;
    };
    isTouching: boolean;
    frozenRounds: {
      roundOne: boolean;
      roundTwo: boolean;
    };
    hasShownSwipeHint: boolean;
    resetKey: number;
  };
  operations: {
    onSwipeHintSeen: () => void;
    onSettled: (round: AllocationRound) => void;
  };
  children: (
    navigation: {
      scrollX: SharedValue<number>;
      isIdle: SharedValue<boolean>;
    },
    navigationLayer: ReactNode,
  ) => ReactNode;
}) {
  const { width } = useWindowDimensions();
  const { theme } = useGameTheme();
  const roundScrollX = useSharedValue(0);
  const isRoundNavigationIdle = useSharedValue(true);
  const hasCrossedThreshold = useSharedValue(false);
  const arrowBounce = useSharedValue(0);
  const scrollRef = useRef<ScrollView>(null);
  const handleSwipeHintSeen = () => props.operations.onSwipeHintSeen();
  const handleNavigationSettled = (offset: number) => {
    "worklet";
    const settled = settleRoundNavigation(offset, width);
    isRoundNavigationIdle.set(settled.isIdle);
    scheduleOnRN(props.operations.onSettled, settled.round);
  };
  const startArrowBounce = () => {
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
  };
  const resetNavigation = () => {
    const reset = createRoundNavigationReset();
    roundScrollX.set(reset.offset);
    isRoundNavigationIdle.set(reset.isIdle);
    hasCrossedThreshold.set(reset.threshold.hasEmitted);
    scrollRef.current?.scrollTo({ x: reset.offset, animated: false });
  };
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      roundScrollX.set(event.contentOffset.x);
      if (
        shouldEmitRoundSwipeThreshold(
          hasCrossedThreshold.get(),
          event.contentOffset.x,
          width,
        )
      ) {
        hasCrossedThreshold.set(true);
        scheduleOnRN(handleSwipeHintSeen);
      }
    },
    onBeginDrag: () => {
      isRoundNavigationIdle.set(false);
    },
    onEndDrag: (event) => {
      if (didDragSettleWithoutMomentum(event.velocity?.x)) {
        handleNavigationSettled(event.contentOffset.x);
      }
    },
    onMomentumEnd: (event) => {
      handleNavigationSettled(event.contentOffset.x);
    },
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

  useEffect(startArrowBounce, [arrowBounce]);

  useEffect(resetNavigation, [
    hasCrossedThreshold,
    isRoundNavigationIdle,
    props.state.resetKey,
    roundScrollX,
  ]);

  const navigationLayer = (
    <>
      {props.state.isMultiRound ? (
        <>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={canNavigateRounds(
              props.state.frozenRounds.roundOne,
              props.state.isTouching,
            )}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            <View style={{ width }}>
              <RoundScreen
                fingersCount={props.state.playerCounts.firstRound}
                touchCount={props.state.playerCounts.touching}
                isActive={props.state.currentRound === 0}
                isFrozen={props.state.frozenRounds.roundOne}
                allowOverExpected={false}
              />
            </View>
            <View style={{ width }}>
              <RoundScreen
                fingersCount={props.state.playerCounts.secondRound}
                touchCount={props.state.playerCounts.touching}
                isActive={props.state.currentRound === 1}
                isFrozen={props.state.frozenRounds.roundTwo}
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
                  inactiveColor={theme.chrome.paginationInactiveColor}
                  activeColor={theme.chrome.paginationActiveColor}
                />
              ))}
            </View>
          </View>
          {props.state.currentRound === 0 &&
          props.state.frozenRounds.roundOne &&
          !props.state.hasShownSwipeHint ? (
            <View
              className={cn(
                "absolute right-8 inset-y-0 items-center justify-center",
              )}
            >
              <Animated.View style={rightArrowStyle}>
                <Ionicons
                  name="chevron-forward-outline"
                  size={34}
                  color={theme.chrome.navigationIconColor}
                />
              </Animated.View>
            </View>
          ) : null}
          {props.state.currentRound === 1 &&
          props.state.frozenRounds.roundTwo ? (
            <View
              className={cn(
                "absolute left-8 inset-y-0 items-center justify-center",
              )}
            >
              <Animated.View style={leftArrowStyle}>
                <Ionicons
                  name="chevron-back-outline"
                  size={34}
                  color={theme.chrome.navigationIconColor}
                />
              </Animated.View>
            </View>
          ) : null}
        </>
      ) : (
        <View className={cn("absolute inset-0")} pointerEvents="none">
          <RoundScreen
            fingersCount={props.state.playerCounts.firstRound}
            touchCount={props.state.playerCounts.touching}
            isActive
            isFrozen={props.state.frozenRounds.roundOne}
            allowOverExpected
          />
        </View>
      )}
    </>
  );

  return props.children(
    { scrollX: roundScrollX, isIdle: isRoundNavigationIdle },
    navigationLayer,
  );
}
