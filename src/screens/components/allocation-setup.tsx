import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import { AppText } from "@/src/components/app-text";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import type {
  PlayerSelection,
  SelectedTeamCount,
} from "@/src/screens/state/allocation-setup-state";
import { getPlayerSelectionLabel } from "@/src/screens/state/allocation-setup-state";
import { H } from "@/src/screens/utils/helper";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, PressableFeedback, cn } from "heroui-native";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function StepperButton(props: {
  accessibilityLabel: string;
  isDisabled: boolean;
  symbol: "−" | "+";
  onPress: () => void;
}) {
  const { theme } = useGameTheme();

  return (
    <Button
      size="md"
      className={cn(
        "size-12 items-center justify-center rounded-full border px-0",
        theme.chrome.controlClassName,
        props.isDisabled && "opacity-35",
      )}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: props.isDisabled }}
      isDisabled={props.isDisabled}
      onPress={() => {
        void H.selectionChange();
        props.onPress();
      }}
      animation={{
        scale: {
          value: 1.04,
          timingConfig: { duration: 140 },
        },
      }}
      isIconOnly
    >
      <Button.Label>
        <AppText
          className={cn(
            "text-2xl font-semibold leading-none",
            theme.chrome.primaryTextClassName,
          )}
        >
          {props.symbol}
        </AppText>
      </Button.Label>
    </Button>
  );
}

function AllocationStepper(props: {
  decrementAccessibilityLabel: string;
  incrementAccessibilityLabel: string;
  isDecrementDisabled: boolean;
  isIncrementDisabled: boolean;
  label: string;
  showsDecrementButton: boolean;
  value: string;
  valueAccessibilityLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const { theme } = useGameTheme();

  return (
    <View className={cn("flex-row items-center gap-2 py-4")}>
      <AppText
        className={cn(
          "min-w-24 flex-1 text-base font-semibold",
          theme.chrome.primaryTextClassName,
        )}
      >
        {props.label}
      </AppText>
      {props.showsDecrementButton ? (
        <StepperButton
          symbol="−"
          isDisabled={props.isDecrementDisabled}
          accessibilityLabel={props.decrementAccessibilityLabel}
          onPress={props.onDecrement}
        />
      ) : (
        <View
          className={cn("size-12")}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
      <View className={cn("w-12 items-center justify-center")}>
        <Animated.View
          key={props.value}
          entering={FadeIn.duration(160)
            .easing(Easing.out(Easing.cubic))
            .reduceMotion(ReduceMotion.System)}
          accessible
          accessibilityLabel={props.valueAccessibilityLabel}
        >
          <AppText
            className={cn(
              "text-center text-2xl font-bold",
              theme.chrome.primaryTextClassName,
            )}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {props.value}
          </AppText>
        </Animated.View>
      </View>
      <StepperButton
        symbol="+"
        isDisabled={props.isIncrementDisabled}
        accessibilityLabel={props.incrementAccessibilityLabel}
        onPress={props.onIncrement}
      />
    </View>
  );
}

export default function AllocationSetup(props: {
  playerSelection: PlayerSelection;
  showsPlayerSelection: boolean;
  selectedTeams: SelectedTeamCount;
  isPairingModeEnabled: boolean;
  onDecrementPlayers: () => void;
  onIncrementPlayers: () => void;
  onDecrementTeams: () => void;
  onIncrementTeams: () => void;
  onPairingModeChange: (isEnabled: boolean) => void;
  onStart: () => void;
}) {
  const { t } = useLingui();
  const { theme } = useGameTheme();
  const insets = useSafeAreaInsets();
  const blurIntensity = useSharedValue(40);
  const playerValue = getPlayerSelectionLabel(props.playerSelection);
  const playerValueAccessibilityLabel =
    props.playerSelection.mode === "observed"
      ? t`Up to 5 players`
      : t`Players, ${props.playerSelection.count}`;
  const playerDecrementAccessibilityLabel =
    props.playerSelection.mode === "declared" &&
    props.playerSelection.count === 6
      ? t`Use up to 5 players`
      : t`Decrease players`;
  const playerIncrementAccessibilityLabel =
    props.playerSelection.mode === "observed"
      ? t`Select 6 players`
      : t`Increase players`;

  return (
    <View
      className={cn("flex-1 px-6")}
      style={{
        paddingTop: insets.top + 18,
        paddingBottom: Math.max(insets.bottom, 24) + 72,
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(300)
          .easing(Easing.out(Easing.cubic))
          .reduceMotion(ReduceMotion.System)}
        className={cn("items-center")}
      >
        <PressableFeedback
          accessible={false}
          animation={false}
          delayLongPress={1200}
          onLongPress={() => {
            props.onPairingModeChange(!props.isPairingModeEnabled);
          }}
        >
          <AppText
            className={cn(
              "px-0.5 text-center",
              theme.chrome.brandTextClassName,
            )}
            style={{
              fontFamily: "QuickSand",
              fontSize: 19,
              lineHeight: 24,
              letterSpacing: -0.35,
            }}
          >
            Choose Your Team
          </AppText>
        </PressableFeedback>
      </Animated.View>

      <View className={cn("flex-1 justify-center")}>
        <Animated.View
          entering={FadeInDown.delay(70)
            .duration(360)
            .easing(Easing.out(Easing.cubic))
            .reduceMotion(ReduceMotion.System)}
          className={cn("w-full self-center")}
          style={{ maxWidth: 520 }}
        >
          <View
            className={cn(
              "overflow-hidden rounded-3xl border-2 px-5",
              theme.chrome.cardClassName,
            )}
            style={{ borderCurve: "continuous" }}
          >
            <AnimatedBlurView
              blurIntensity={blurIntensity}
              tint={theme.chrome.controlBlurTint}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              className={cn(theme.chrome.cardOverlayClassName)}
            />
            <AllocationStepper
              label={t`Teams`}
              value={String(props.selectedTeams)}
              valueAccessibilityLabel={t`Teams, ${props.selectedTeams}`}
              decrementAccessibilityLabel={t`Decrease teams`}
              incrementAccessibilityLabel={t`Increase teams`}
              isDecrementDisabled={props.selectedTeams === 2}
              isIncrementDisabled={props.selectedTeams === 5}
              showsDecrementButton={props.selectedTeams > 2}
              onDecrement={props.onDecrementTeams}
              onIncrement={props.onIncrementTeams}
            />
            {props.showsPlayerSelection ? (
              <>
                <View
                  className={cn("h-px opacity-25")}
                  style={{ backgroundColor: theme.chrome.controlIconColor }}
                />
                <AllocationStepper
                  label={t`More players`}
                  value={playerValue}
                  valueAccessibilityLabel={playerValueAccessibilityLabel}
                  decrementAccessibilityLabel={
                    playerDecrementAccessibilityLabel
                  }
                  incrementAccessibilityLabel={
                    playerIncrementAccessibilityLabel
                  }
                  isDecrementDisabled={
                    props.playerSelection.mode === "observed"
                  }
                  isIncrementDisabled={
                    props.playerSelection.mode === "declared" &&
                    props.playerSelection.count === 10
                  }
                  showsDecrementButton={
                    props.playerSelection.mode === "declared"
                  }
                  onDecrement={props.onDecrementPlayers}
                  onIncrement={props.onIncrementPlayers}
                />
              </>
            ) : null}
          </View>

          <Button
            size="lg"
            className={cn("mt-5 h-14 w-full rounded-2xl")}
            style={{
              backgroundColor: theme.chrome.accentColor,
              borderCurve: "continuous",
            }}
            accessibilityRole="button"
            accessibilityLabel={t`Start`}
            onPress={props.onStart}
            animation={{
              scale: {
                value: 1.02,
                timingConfig: { duration: 150 },
              },
            }}
          >
            <Button.Label
              className={cn(
                "text-lg font-bold",
                theme.chrome.primaryTextClassName,
              )}
            >
              <Trans>Start</Trans>
            </Button.Label>
          </Button>
        </Animated.View>
      </View>
    </View>
  );
}
