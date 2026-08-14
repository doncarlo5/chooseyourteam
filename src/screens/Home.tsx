import { PaginationIndicator } from "@/src/components/component-presentation/pagination-indicator";
import MeshGradientBackground from "@/src/app/(home)/components/mesh-gradient-background";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import { useEffect, useReducer, useRef, useState } from "react";
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
import { homeGameReducer, initialHomeGameState } from "./state/home-game-state";
import { H } from "./utils/helper";

export default function Home() {
  const { width } = useWindowDimensions();

  const [game, dispatchGame] = useReducer(
    homeGameReducer,
    initialHomeGameState,
  );
  const [isMorePlayersDialogOpen, setIsMorePlayersDialogOpen] = useState(false);

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
      scheduleOnRN(dispatchGame, {
        type: "roundVisibilityChanged",
        isRoundTwoVisible: isSecond,
      });
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
  const selectedTeamCount = game.selectedTeams ?? 0;
  const isMultiRound = game.declaredPlayerCount !== null;
  const firstRoundCount = isMultiRound ? 5 : selectedTeamCount;
  const secondRoundCount = game.declaredPlayerCount
    ? game.declaredPlayerCount - firstRoundCount
    : 0;
  const requiredTouchCount = isMultiRound
    ? game.currentRound === 0
      ? firstRoundCount
      : secondRoundCount
    : selectedTeamCount;
  const canTouch = !isMultiRound
    ? !game.isRoundOneFrozen
    : game.currentRound === 0
      ? !game.isRoundOneFrozen
      : !game.isRoundTwoFrozen;
  const touchEnabled =
    canTouch && !game.isRoundScrolling && !isMorePlayersDialogOpen;
  const resetAllocationSession = () => {
    roundScrollX.set(0);
    roundScrollRef.current?.scrollTo({ x: 0, animated: false });
  };
  const handleTeamSelection = (teamCount: number) => {
    dispatchGame({ type: "selectTeams", teamCount });
    resetAllocationSession();
  };
  const handleInseparableChange = (isEnabled: boolean) => {
    dispatchGame({ type: "setInseparable", isEnabled });
    void (isEnabled ? H.inseparableOn() : H.inseparableOff());
  };
  const handleDeclaredPlayerCountSelection = (playerCount: number) => {
    if (!game.selectedTeams) {
      return;
    }
    dispatchGame({ type: "selectPlayerCount", playerCount });
    resetAllocationSession();
  };
  const handleBack = () => {
    dispatchGame({ type: "backToTeamSelection" });
    resetAllocationSession();
  };
  const { touchGesture, overlay, backButton, isTouching, touchCount } =
    useSelectedPlayersLayer({
      selectedTeams: game.selectedTeams,
      toggleRectSv,
      plusButtonRectSv,
      onRevealSnapshot: (dots) => {
        if (!isMultiRound) {
          dispatchGame({ type: "revealRound", round: 0, dots });
          return;
        }
        if (game.currentRound === 0 && !game.isRoundOneFrozen) {
          dispatchGame({ type: "revealRound", round: 0, dots });
        }
        if (game.currentRound === 1 && !game.isRoundTwoFrozen) {
          dispatchGame({ type: "revealRound", round: 1, dots });
        }
      },
      isTouchEnabled: touchEnabled,
      isScrollGestureActive: game.isRoundScrolling,
      expectedTouchCount: requiredTouchCount,
      allowOverExpected: !isMultiRound,
      roundAssignment: isMultiRound
        ? game.currentRound === 0
          ? game.multiRoundPlan?.roundOne
          : game.multiRoundPlan?.roundTwo
        : undefined,
      isInseparableEnabled: game.isInseparableEnabled,
      resetKey: game.roundResetKey,
      onBack: handleBack,
    });

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

  const showLiveOverlay = !isMultiRound
    ? !game.isRoundOneFrozen || game.roundOneSnapshot.length === 0
    : game.currentRound === 0
      ? !game.isRoundOneFrozen || game.roundOneSnapshot.length === 0
      : !game.isRoundTwoFrozen || game.roundTwoSnapshot.length === 0;
  const hideOverlayDuringSwipe =
    isMultiRound && game.currentRound === 0 && game.isRoundTwoVisible;

  return (
    <View className={cn("flex-1")} style={{ backgroundColor: "transparent" }}>
      <MeshGradientBackground />
      {!game.selectedTeams ? (
        <>
          <TeamsSelection
            selectedTeams={game.selectedTeams}
            isInseparableEnabled={game.isInseparableEnabled}
            onSelectTeams={handleTeamSelection}
            onInseparableChange={handleInseparableChange}
          />
          <AppReviewButton />
        </>
      ) : (
        <GestureDetector gesture={touchGesture}>
          <View
            className={cn("flex-1")}
            style={{ backgroundColor: "transparent" }}
          >
            <View className="absolute top-16 right-6 z-10 items-center gap-2">
              <DialogMorePlayers
                selectedTeams={game.selectedTeams}
                onSelectPlayerCount={handleDeclaredPlayerCountSelection}
                onOpenChange={setIsMorePlayersDialogOpen}
                plusButtonRectSv={plusButtonRectSv}
              />
            </View>
            {isMultiRound && (
              <Animated.ScrollView
                ref={roundScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={game.isRoundOneFrozen && !isTouching}
                onScroll={roundScrollHandler}
                scrollEventThrottle={16}
                onScrollBeginDrag={() =>
                  dispatchGame({ type: "roundScrollStarted" })
                }
                onScrollEndDrag={(event) => {
                  if (!event.nativeEvent.velocity?.x) {
                    dispatchGame({ type: "roundScrollDragEnded" });
                  }
                }}
                onMomentumScrollEnd={(event) => {
                  const nextRound = Math.round(
                    event.nativeEvent.contentOffset.x / width,
                  );
                  dispatchGame({
                    type: "roundScrollFinished",
                    round: nextRound,
                  });
                }}
              >
                <View style={{ width }}>
                  <RoundScreen
                    fingersCount={firstRoundCount}
                    touchCount={touchCount}
                    isActive={game.currentRound === 0}
                    isFrozen={game.isRoundOneFrozen}
                    allowOverExpected={false}
                  />
                </View>
                <View style={{ width }}>
                  <RoundScreen
                    fingersCount={secondRoundCount}
                    touchCount={touchCount}
                    isActive={game.currentRound === 1}
                    isFrozen={game.isRoundTwoFrozen}
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
                  isFrozen={game.isRoundOneFrozen}
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
            {isMultiRound && game.isRoundOneFrozen ? (
              <Animated.View
                className="absolute inset-0"
                style={roundOneFrozenStyle}
                pointerEvents="none"
              >
                <FrozenDotsLayer dots={game.roundOneSnapshot} />
              </Animated.View>
            ) : null}
            {!isMultiRound && game.isRoundOneFrozen ? (
              <View className="absolute inset-0" pointerEvents="none">
                <FrozenDotsLayer dots={game.roundOneSnapshot} />
              </View>
            ) : null}
            {isMultiRound && game.isRoundTwoFrozen ? (
              <Animated.View
                className="absolute inset-0"
                style={roundTwoFrozenStyle}
                pointerEvents="none"
              >
                <FrozenDotsLayer dots={game.roundTwoSnapshot} />
              </Animated.View>
            ) : null}
            {isMultiRound &&
            game.currentRound === 0 &&
            game.isRoundOneFrozen &&
            !game.hasShownSwipeHint ? (
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
            {isMultiRound &&
            game.currentRound === 1 &&
            game.isRoundTwoFrozen ? (
              <View className="absolute left-8 inset-y-0 items-center justify-center">
                <Animated.View style={arrowLeftStyle}>
                  <Ionicons
                    name="chevron-back-outline"
                    size={34}
                    color="#0B0B0B"
                  />
                </Animated.View>
              </View>
            ) : null}
            {showLiveOverlay && !hideOverlayDuringSwipe ? overlay : null}
            {backButton}
          </View>
        </GestureDetector>
      )}
      <StatusBar style="dark" />
    </View>
  );
}
