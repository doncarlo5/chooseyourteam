import { PaginationIndicator } from "@/src/components/component-presentation/pagination-indicator";
import MeshGradientBackground from "./components/mesh-gradient-background";
import { planMultiRoundAssignments } from "@/src/domain/team-allocation";
import type { RevealedPlayer } from "@/src/domain/revealed-player";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
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
import AppInfoButton from "./components/app-info-button";
import AppShareButton from "./components/app-share-button";
import AllocationBackButton from "./components/allocation-back-button";
import DialogMorePlayers from "./components/dialog-more-players";
import RoundScreen from "./components/round-screen";
import TeamsSelection from "./components/teams-selection";
import TouchAllocationScene from "./components/touch-allocation-scene";
import { homeGameReducer, initialHomeGameState } from "./state/home-game-state";
import { H } from "./utils/helper";

export default function Home() {
  const { width } = useWindowDimensions();

  const [game, dispatchGame] = useReducer(
    homeGameReducer,
    initialHomeGameState,
  );
  const [isMorePlayersDialogOpen, setIsMorePlayersDialogOpen] = useState(false);
  const [isExitRequested, setIsExitRequested] = useState(false);
  const isMultiRound = game.declaredPlayerCount !== null;

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
  const backButtonRectSv = useSharedValue<TouchRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isReady: false,
  });
  const roundScrollX = useSharedValue(0);
  const hasCrossedRoundThreshold = useSharedValue(false);
  const roundScrollRef = useRef<ScrollView>(null);
  const handleRoundSwipeHintSeen = () => {
    dispatchGame({ type: "roundSwipeHintSeen" });
  };
  const roundScrollHandler = useAnimatedScrollHandler((event) => {
    roundScrollX.set(event.contentOffset.x);
    if (isMultiRound) {
      const isSecond = event.contentOffset.x >= width * 0.5;
      if (isSecond && !hasCrossedRoundThreshold.get()) {
        hasCrossedRoundThreshold.set(true);
        scheduleOnRN(handleRoundSwipeHintSeen);
      }
    }
  });
  const arrowBounce = useSharedValue(0);
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
  const [touchState, setTouchState] = useState({
    count: 0,
    isTouching: false,
  });
  const excludedTouchRects = useMemo(
    () => [toggleRectSv, plusButtonRectSv, backButtonRectSv],
    [toggleRectSv, plusButtonRectSv, backButtonRectSv],
  );
  const resetAllocationSession = () => {
    roundScrollX.set(0);
    hasCrossedRoundThreshold.set(false);
    roundScrollRef.current?.scrollTo({ x: 0, animated: false });
  };
  const handleTeamSelection = (teamCount: number) => {
    dispatchGame({ type: "selectTeams", teamCount });
    resetAllocationSession();
  };
  const handlePairingModeChange = (isEnabled: boolean) => {
    dispatchGame({ type: "setPairingMode", isEnabled });
    void (isEnabled ? H.pairingModeOn() : H.pairingModeOff());
  };
  const handleDeclaredPlayerCountSelection = (playerCount: number) => {
    if (!game.selectedTeams) {
      return;
    }
    const plan = planMultiRoundAssignments(
      game.selectedTeams,
      playerCount,
      Math.random,
      { pairingMode: game.isPairingModeEnabled },
    );
    dispatchGame({ type: "selectPlayerCount", playerCount, plan });
    resetAllocationSession();
  };
  const handleBack = () => {
    setIsExitRequested(true);
  };
  const handleExitReady = () => {
    dispatchGame({ type: "backToTeamSelection" });
    resetAllocationSession();
    setIsExitRequested(false);
  };
  const handleReveal = useCallback(
    (event: { round: 0 | 1; players: RevealedPlayer[] }) => {
      if (event.round === 0 && !game.isRoundOneFrozen) {
        dispatchGame({
          type: "revealRound",
          round: 0,
          players: event.players,
        });
      }
      if (event.round === 1 && !game.isRoundTwoFrozen) {
        dispatchGame({
          type: "revealRound",
          round: 1,
          players: event.players,
        });
      }
    },
    [game.isRoundOneFrozen, game.isRoundTwoFrozen],
  );
  const handleTouchStateChange = useCallback(
    (nextState: { count: number; isTouching: boolean }) => {
      setTouchState((currentState) =>
        currentState.count === nextState.count &&
        currentState.isTouching === nextState.isTouching
          ? currentState
          : nextState,
      );
    },
    [],
  );

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

  return (
    <View className={cn("flex-1")} style={{ backgroundColor: "transparent" }}>
      <MeshGradientBackground />
      {!game.selectedTeams ? (
        <>
          <TeamsSelection
            selectedTeams={game.selectedTeams}
            isPairingModeEnabled={game.isPairingModeEnabled}
            onSelectTeams={handleTeamSelection}
            onPairingModeChange={handlePairingModeChange}
          />
          <AppInfoButton />
          <AppShareButton />
        </>
      ) : (
        <TouchAllocationScene
          configuration={{
            selectedTeams: game.selectedTeams,
            round: game.currentRound === 0 ? 0 : 1,
            expectedTouchCount: requiredTouchCount,
            allowOverExpected: !isMultiRound,
            roundAssignment: isMultiRound
              ? game.currentRound === 0
                ? game.multiRoundPlan?.roundOne
                : game.multiRoundPlan?.roundTwo
              : undefined,
            isPairingModeEnabled: game.isPairingModeEnabled,
            acceptsNewTouches: touchEnabled,
            resetKey: game.roundResetKey,
          }}
          excludedRects={excludedTouchRects}
          frozenRounds={{
            roundOne: game.roundOneSnapshot,
            roundTwo: game.roundTwoSnapshot,
          }}
          roundScrollX={roundScrollX}
          isMultiRound={isMultiRound}
          onReveal={handleReveal}
          onTouchStateChange={handleTouchStateChange}
          exitRequested={isExitRequested}
          onExitReady={handleExitReady}
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
              scrollEnabled={game.isRoundOneFrozen && !touchState.isTouching}
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
                  touchCount={touchState.count}
                  isActive={game.currentRound === 0}
                  isFrozen={game.isRoundOneFrozen}
                  allowOverExpected={false}
                />
              </View>
              <View style={{ width }}>
                <RoundScreen
                  fingersCount={secondRoundCount}
                  touchCount={touchState.count}
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
                touchCount={touchState.count}
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
          {isMultiRound && game.currentRound === 1 && game.isRoundTwoFrozen ? (
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
          <AllocationBackButton
            rect={backButtonRectSv}
            isDisabled={isExitRequested}
            onPress={handleBack}
          />
        </TouchAllocationScene>
      )}
      <AppReviewButton isVisible={!game.selectedTeams} />
      <StatusBar style="dark" />
    </View>
  );
}
