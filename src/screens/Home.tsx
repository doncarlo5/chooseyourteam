import { PaginationIndicator } from "@/src/components/component-presentation/pagination-indicator";
import type { FrozenDot, TouchRect } from "@/src/helpers/types/home-screen";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import { useEffect, useRef, useState, type ElementRef } from "react";
import { View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
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
  const [totalPlayers, setTotalPlayers] = useState(5);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundOneSnapshot, setRoundOneSnapshot] = useState<FrozenDot[]>([]);
  const [isRoundOneFrozen, setIsRoundOneFrozen] = useState(false);
  const [roundTwoSnapshot, setRoundTwoSnapshot] = useState<FrozenDot[]>([]);
  const [isRoundTwoFrozen, setIsRoundTwoFrozen] = useState(false);
  const [round2Started, setRound2Started] = useState(false);
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
  const roundScrollRef = useRef<ElementRef<typeof Animated.ScrollView>>(null);
  const roundScrollHandler = useAnimatedScrollHandler((event) => {
    roundScrollX.value = event.contentOffset.x;
    if (isMultiRound) {
      const isSecond = event.contentOffset.x >= width * 0.5;
      runOnJS(setIsRoundTwoVisible)(isSecond);
    }
  });
  const arrowBounce = useSharedValue(0);
  const roundOneFrozenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -roundScrollX.value }],
    opacity: interpolate(
      roundScrollX.value,
      [0, width * 0.5, width],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    ),
  }));
  const roundTwoFrozenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: width - roundScrollX.value }],
    opacity: interpolate(
      roundScrollX.value,
      [0, width * 0.5, width],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    ),
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: arrowBounce.value }],
  }));
  const isMultiRound = totalPlayers > 5;
  const firstRoundCount = Math.min(5, totalPlayers);
  const secondRoundCount = Math.max(0, totalPlayers - 5);
  const expectedTouchCount = isMultiRound
    ? currentRound === 0
      ? firstRoundCount
      : secondRoundCount
    : undefined;
  const canTouch =
    !isMultiRound ||
    (currentRound === 0 ? !isRoundOneFrozen : !isRoundTwoFrozen);
  const touchEnabled = canTouch && !isRoundScrolling;
  const {
    touchGesture,
    overlay,
    backButton,
    isRevealed,
    isTouching,
    touchCount,
  } = useSelectedPlayersLayer({
    selectedTeams,
    toggleRectSv,
    plusButtonRectSv,
    onRevealSnapshot: (dots) => {
      if (!isMultiRound) {
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
    expectedTouchCount,
    allowOverExpected: !isMultiRound,
    resetKey: roundResetKey,
    onBack: () => {
      setSelectedTeams(null);
      setTotalPlayers(5);
      setCurrentRound(0);
      setRoundOneSnapshot([]);
      setIsRoundOneFrozen(false);
      setRoundTwoSnapshot([]);
      setIsRoundTwoFrozen(false);
      setRound2Started(false);
      setRoundResetKey((prev) => prev + 1);
      setIsRoundTwoVisible(false);
      roundScrollX.value = 0;
      roundScrollRef.current?.scrollTo({ x: 0, animated: false });
    },
  });

  useEffect(() => {
    setCurrentRound(0);
    setRoundOneSnapshot([]);
    setIsRoundOneFrozen(false);
    setRoundTwoSnapshot([]);
    setIsRoundTwoFrozen(false);
    setRound2Started(false);
    setRoundResetKey((prev) => prev + 1);
    setIsRoundTwoVisible(false);
    setIsRoundScrolling(false);
    setHasShownSwipeHint(false);
    roundScrollX.value = 0;
    roundScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [selectedTeams, totalPlayers]);

  useEffect(() => {
    if (isRoundTwoVisible) {
      setHasShownSwipeHint(true);
    }
  }, [isRoundTwoVisible]);
  useEffect(() => {
    arrowBounce.value = withRepeat(
      withTiming(8, {
        duration: 800,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [arrowBounce]);

  if (!selectedTeams) {
    return (
      <View className={cn("flex-1 bg-[#E4E4E4]")}>
        <TeamsSelection
          selectedTeams={selectedTeams}
          setSelectedTeams={setSelectedTeams}
        />
        <AppReviewButton />

        <StatusBar style="dark" />
      </View>
    );
  }

  const roundLabels = ["Round 1", "Round 2"];
  const showLiveOverlay =
    !isMultiRound ||
    (currentRound === 0
      ? !isRoundOneFrozen || roundOneSnapshot.length === 0
      : !isRoundTwoFrozen || roundTwoSnapshot.length === 0);
  const hideOverlayDuringSwipe =
    isMultiRound && currentRound === 0 && isRoundTwoVisible;
  const showPlusButton =
    currentRound === 0 &&
    !isRoundTwoVisible &&
    !isRevealed &&
    !isRoundOneFrozen &&
    !isRoundTwoFrozen;

  return (
    <GestureDetector gesture={touchGesture}>
      <View className={cn("flex-1 bg-[#E4E4E4]")}>
        <View className="absolute top-16 right-6 z-10 items-center gap-2">
          {showPlusButton ? (
            <DialogMorePlayers
              selectedTeams={selectedTeams}
              setTotalPlayers={setTotalPlayers}
              plusButtonRectSv={plusButtonRectSv}
              isRevealed={isRevealed}
              isTouching={isTouching}
            />
          ) : null}
        </View>
        {isMultiRound && (
          <Animated.ScrollView
            ref={roundScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={
              (currentRound !== 1 || isRoundTwoFrozen || isRevealed) &&
              (isRevealed ||
                !isTouching ||
                isRoundOneFrozen ||
                isRoundTwoFrozen)
            }
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
                event.nativeEvent.contentOffset.x / width
              );
              setCurrentRound(nextRound);
              if (nextRound === 1 && !round2Started) {
                setRound2Started(true);
                setRoundResetKey((prev) => prev + 1);
              }
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
        {isMultiRound && (
          <View className="absolute left-6" style={{ bottom: 40 }}>
            <View className="flex-row items-center gap-1">
              {roundLabels.map((label, index) => (
                <PaginationIndicator
                  key={label}
                  index={index}
                  label={label}
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
                size={22}
                color="#0B0B0B"
              />
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
