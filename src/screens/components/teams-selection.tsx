import { AppText } from "@/src/components/app-text";
import { Trans } from "@lingui/react/macro";
import { PressableFeedback, cn } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PairingModeToggle from "./pairing-mode-toggle";
import { PlayerCard } from "./player-card";

const GROUP_OPTIONS = [2, 3, 4, 5];

export default function TeamsSelection(props: {
  selectedTeams: number | null;
  isPairingModeEnabled: boolean;
  onSelectTeams: (teams: number) => void;
  onPairingModeChange: (isEnabled: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const [isPairingModeToggleVisible, setIsPairingModeToggleVisible] =
    useState(false);

  if (props.selectedTeams) return null;

  return (
    <View
      className={cn("flex-1 px-6")}
      style={{
        paddingTop: insets.top + 18,
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(420).easing(Easing.out(Easing.cubic))}
        className={cn("items-center")}
      >
        <PressableFeedback
          accessible={false}
          animation={false}
          delayLongPress={1200}
          onLongPress={() => {
            setIsPairingModeToggleVisible(true);
          }}
        >
          <AppText
            className={cn("px-0.5 text-center text-black/75")}
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
        {isPairingModeToggleVisible ? (
          <PairingModeToggle
            isEnabled={props.isPairingModeEnabled}
            onValueChange={props.onPairingModeChange}
          />
        ) : null}
      </Animated.View>

      <View className={cn("flex-1 justify-center")}>
        <Animated.View
          entering={FadeInDown.delay(100)
            .duration(460)
            .easing(Easing.out(Easing.cubic))}
          className={cn("mb-8 px-2")}
        >
          <AppText
            className={cn("text-center text-[#0B0B0B]")}
            style={{
              fontFamily: "QuickSand",
              fontSize: 38,
              lineHeight: 44,
              letterSpacing: -1.15,
            }}
          >
            <Trans>How many teams?</Trans>
          </AppText>
          <AppText className={cn("mt-2 text-center text-base text-black/55")}>
            <Trans>Pick a number to get started</Trans>
          </AppText>
        </Animated.View>

        <View className={cn("w-full")}>
          <View className={cn("flex-row flex-wrap -mx-2")}>
            {GROUP_OPTIONS.map((count, index) => {
              return (
                <PlayerCard
                  key={count}
                  count={count}
                  index={index}
                  isDisabled={false}
                  onPress={() => {
                    props.onSelectTeams(count);
                  }}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
