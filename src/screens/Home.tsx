import { PaginationIndicator } from "@/src/components/component-presentation/pagination-indicator";
import {
  planMultiRoundAssignments,
  type MultiRoundAssignmentPlan,
} from "@/src/domain/team-allocation";
import type { FrozenDot, TouchRect } from "@/src/helpers/types/home-screen";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import AppReviewButton from "./components/app-review-button";
import DialogMorePlayers from "./components/dialog-more-players";
import FrozenDotsLayer from "./components/frozen-dots-layer";
import RoundScreen from "./components/round-screen";
import useSelectedPlayersLayer from "./components/selected-players-layer";
import TeamsSelection from "./components/teams-selection";

export default function Home(props: {}) {
  void props;
  const { width } = useWindowDimensions();

  const [selectedTeams, setSelectedTeams] = useState<number | null>(null);
  const [declaredPlayerCount, setDeclaredPlayerCount] = useState<number | null>(
    null,
  );
  const [multiRoundPlan, setMultiRoundPlan] =
    useState<MultiRoundAssignmentPlan | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundOneSnapshot, setRoundOneSnapshot] = useState<FrozenDot[]>([]);
  const [isRoundOneFrozen, setIsRoundOneFrozen] = useState(false);
  const [roundTwoSnapshot, setRoundTwoSnapshot] = useState<FrozenDot[]>([]);
  const [isRoundTwoFrozen, setIsRoundTwoFrozen] = useState(false);
  const [roundResetKey, setRoundResetKey] = useState(0);
  const [isRoundTwoVisible, setIsRoundTwoVisible] = useState(false);
  const [isRoundScrolling, setIsRoundScrolling] = useState(false);
  const [hasShownSwipeHint, setHasShownSwipeHint] = useState(false);

  const toggleRectSv = useSharedValue<TouchRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isReady: false,
  });
  const plusButtonRectSv = useSharedValue<TouchRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isReady: false,
  });
  const roundScrollX = useSharedValue(0);
  const roundScrollRef = useRef<ScrollView>(null);
  const roundScrollHandler = useAnimatedScrollHandler((event) => {
    roundScrollX.value = event.contentOffset.x;
    if (isMultiRound) {
      const isSecond = event.contentOffset.x >= width * 0.5;
      scheduleOnRN(setIsRoundTwoVisible, isSecond);
    }
  });
  const arrowBounce = useSharedValue(0);
  const roundOneFrozenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -roundScrollX.value }],
    opacity: interpolate(
      roundScrollX.value,
      [0, width * 0.5, width],
      [1, 0.5, 0],
      Extrapolation.CLAMP,
    ),
  }));
  const roundTwoFrozenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: width - roundScrollX.value }],
    opacity: interpolate(
      roundScrollX.value,
      [0, width * 0.5, width],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const arrowStyle = useAnimatedStyle(() => {
    const roundFade = interpolate(
      roundScrollX.value,
      [0, width * 0.5, width],
      [1, 0.5, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: interpolate(arrowBounce.value, [0, 1], [0, 12]) },
      ],
      opacity: roundFade,
    };
  });
  const arrowLeftStyle = useAnimatedStyle(() => {
    const roundFade = interpolate(
      roundScrollX.value,
      [0, width * 0.5, width],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: interpolate(arrowBounce.value, [0, 1], [0, -12]) },
      ],
      opacity: roundFade,
    };
  });
  const selectedTeamCount = selectedTeams ?? 0;
  const isMultiRound = declaredPlayerCount !== null;
  const firstRoundCount = isMultiRound ? 5 : selectedTeamCount;
  const secondRoundCount = declaredPlayerCount
    ? declaredPlayerCount - firstRoundCount
    : 0;
  const requiredTouchCount = isMultiRound
    ? currentRound === 0
      ? firstRoundCount
      : secondRoundCount
    : selectedTeamCount;
  const canTouch = !isMultiRound
    ? !isRoundOneFrozen
    : currentRound === 0
      ? !isRoundOneFrozen
      : !isRoundTwoFrozen;
  const touchEnabled = canTouch && !isRoundScrolling;
  const resetAllocationSession = () => {
    setCurrentRound(0);
    setRoundOneSnapshot([]);
    setIsRoundOneFrozen(false);
    setRoundTwoSnapshot([]);
    setIsRoundTwoFrozen(false);
    setRoundResetKey((previous) => previous + 1);
    setIsRoundTwoVisible(false);
    setIsRoundScrolling(false);
    setHasShownSwipeHint(false);
    roundScrollX.set(0);
    roundScrollRef.current?.scrollTo({ x: 0, animated: false });
  };
  const handleTeamSelection = (teamCount: number) => {
    setSelectedTeams(teamCount);
    setDeclaredPlayerCount(null);
    setMultiRoundPlan(null);
    resetAllocationSession();
  };
  const handleDeclaredPlayerCountSelection = (playerCount: number) => {
    if (!selectedTeams) {
      return;
    }
    const nextPlan = planMultiRoundAssignments(selectedTeams, playerCount);
    setDeclaredPlayerCount(playerCount);
    setMultiRoundPlan(nextPlan);
    resetAllocationSession();
  };
  const handleBack = () => {
    setSelectedTeams(null);
    setDeclaredPlayerCount(null);
    setMultiRoundPlan(null);
    resetAllocationSession();
  };
  const { touchGesture, overlay, backButton, isTouching, touchCount } =
    useSelectedPlayersLayer({
      selectedTeams,
      toggleRectSv,
      plusButtonRectSv,
      onRevealSnapshot: (dots) => {
        if (!isMultiRound) {
          setRoundOneSnapshot(dots);
          setIsRoundOneFrozen(true);
          return;
        }
        if (currentRound === 0 && !isRoundOneFrozen) {
          setRoundOneSnapshot(dots);
          setIsRoundOneFrozen(true);
        }
        if (currentRound === 1 && !isRoundTwoFrozen) {
          setRoundTwoSnapshot(dots);
          setIsRoundTwoFrozen(true);
        }
      },
      isTouchEnabled: touchEnabled,
      isScrollGestureActive: isRoundScrolling,
      expectedTouchCount: requiredTouchCount,
      allowOverExpected: !isMultiRound,
      roundAssignment: isMultiRound
        ? currentRound === 0
          ? multiRoundPlan?.roundOne
          : multiRoundPlan?.roundTwo
        : undefined,
      resetKey: roundResetKey,
      onBack: handleBack,
    });

  useEffect(() => {
    if (isRoundTwoVisible) {
      setHasShownSwipeHint(true);
    }
  }, [isRoundTwoVisible]);
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

  if (!selectedTeams) {
    return (
      <View className={cn("flex-1")} style={{ backgroundColor: "transparent" }}>
        <TeamsSelection
          selectedTeams={selectedTeams}
          onSelectTeams={handleTeamSelection}
        />
        <AppReviewButton />

        <StatusBar style="dark" />
      </View>
    );
  }

  const showLiveOverlay = !isMultiRound
    ? !isRoundOneFrozen || roundOneSnapshot.length === 0
    : currentRound === 0
      ? !isRoundOneFrozen || roundOneSnapshot.length === 0
      : !isRoundTwoFrozen || roundTwoSnapshot.length === 0;
  const hideOverlayDuringSwipe =
    isMultiRound && currentRound === 0 && isRoundTwoVisible;
  return (
    <GestureDetector gesture={touchGesture}>
      <View className={cn("flex-1")} style={{ backgroundColor: "transparent" }}>
        <View className="absolute top-16 right-6 z-10 items-center gap-2">
          <DialogMorePlayers
            selectedTeams={selectedTeams}
            onSelectPlayerCount={handleDeclaredPlayerCountSelection}
            plusButtonRectSv={plusButtonRectSv}
          />
        </View>
        {isMultiRound && (
          <Animated.ScrollView
            ref={roundScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={isRoundOneFrozen && !isTouching}
            onScroll={roundScrollHandler}
            scrollEventThrottle={16}
            onScrollBeginDrag={() => setIsRoundScrolling(true)}
            onScrollEndDrag={(event) => {
              if (!event.nativeEvent.velocity?.x) {
                setIsRoundScrolling(false);
              }
            }}
            onMomentumScrollEnd={(event) => {
              const nextRound = Math.round(
                event.nativeEvent.contentOffset.x / width,
              );
              if (nextRound !== currentRound) {
                setRoundResetKey((previous) => previous + 1);
              }
              setCurrentRound(nextRound);
              setIsRoundScrolling(false);
            }}
          >
            <View style={{ width }}>
              <RoundScreen
                fingersCount={firstRoundCount}
                touchCount={touchCount}
                isActive={currentRound === 0}
                isFrozen={isRoundOneFrozen}
                allowOverExpected={false}
              />
            </View>
            <View style={{ width }}>
              <RoundScreen
                fingersCount={secondRoundCount}
                touchCount={touchCount}
                isActive={currentRound === 1}
                isFrozen={isRoundTwoFrozen}
                allowOverExpected={false}
              />
            </View>
          </Animated.ScrollView>
        )}
        {!isMultiRound ? (
          <View className="absolute inset-0" pointerEvents="none">
            <RoundScreen
              fingersCount={selectedTeamCount}
              touchCount={touchCount}
              isActive={true}
              isFrozen={isRoundOneFrozen}
              allowOverExpected={true}
            />
          </View>
        ) : null}
        {isMultiRound && (
          <View
            className="absolute left-0 right-0 items-center"
            style={{ bottom: 40 }}
          >
            <View className="flex-row items-center gap-2">
              {Array.from({ length: 2 }, (_, index) => (
                <PaginationIndicator
                  key={index}
                  index={index}
                  scrollX={roundScrollX}
                  itemSize={width}
                />
              ))}
            </View>
          </View>
        )}
        {isMultiRound && isRoundOneFrozen ? (
          <Animated.View
            className="absolute inset-0"
            style={roundOneFrozenStyle}
            pointerEvents="none"
          >
            <FrozenDotsLayer dots={roundOneSnapshot} />
          </Animated.View>
        ) : null}
        {!isMultiRound && isRoundOneFrozen ? (
          <View className="absolute inset-0" pointerEvents="none">
            <FrozenDotsLayer dots={roundOneSnapshot} />
          </View>
        ) : null}
        {isMultiRound && isRoundTwoFrozen ? (
          <Animated.View
            className="absolute inset-0"
            style={roundTwoFrozenStyle}
            pointerEvents="none"
          >
            <FrozenDotsLayer dots={roundTwoSnapshot} />
          </Animated.View>
        ) : null}
        {isMultiRound &&
        currentRound === 0 &&
        isRoundOneFrozen &&
        !hasShownSwipeHint ? (
          <View className="absolute right-8 inset-y-0 items-center justify-center">
            <Animated.View style={arrowStyle}>
              <Ionicons
                name="chevron-forward-outline"
                size={34}
                color="#0B0B0B"
              />
            </Animated.View>
          </View>
        ) : null}
        {isMultiRound && currentRound === 1 && isRoundTwoFrozen ? (
          <View className="absolute left-8 inset-y-0 items-center justify-center">
            <Animated.View style={arrowLeftStyle}>
              <Ionicons name="chevron-back-outline" size={34} color="#0B0B0B" />
            </Animated.View>
          </View>
        ) : null}
        {showLiveOverlay && !hideOverlayDuringSwipe ? overlay : null}
        {backButton}
        <StatusBar style="dark" />
      </View>
    </GestureDetector>
  );
}
