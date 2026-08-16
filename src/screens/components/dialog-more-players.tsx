import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import { AppText } from "@/src/components/app-text";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import { msg, plural } from "@lingui/core/macro";
import { Trans } from "@lingui/react";
import { useLingui } from "@lingui/react/macro";
import {
  BottomSheet as ExpoBottomSheet,
  BottomSheetView,
} from "@expo/ui/community/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { Button, PressableFeedback, cn } from "heroui-native";
import { createElement, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

const PLAYER_COUNTS = [6, 7, 8, 9, 10];

function PlayerCountLabel(props: { count: number }) {
  const descriptor = msg({
    comment:
      "Visible player count. Keep number and unit placeholders so their separate styles are preserved.",
    message: plural(props.count, {
      one: "<number>#</number><unit>player</unit>",
      other: "<number>#</number><unit>players</unit>",
    }),
  });

  return createElement(Trans, {
    ...descriptor,
    components: {
      number: (
        <AppText
          className={cn("text-5xl font-extrabold leading-none text-[#0B0B0B]")}
        />
      ),
      unit: <AppText className={cn("pl-0.5 leading-none text-black/60")} />,
    },
  });
}

function PlayerCountOption(props: {
  count: number;
  index: number;
  isCentered?: boolean;
  onPress: () => void;
}) {
  const { t } = useLingui();
  const accessibilityLabel = t({
    comment: "Accessibility label for choosing the total player count",
    message: plural(props.count, {
      one: "Select # player",
      other: "Select # players",
    }),
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(props.index * 60)
        .duration(360)
        .easing(Easing.out(Easing.cubic))}
      className={cn(
        "rounded-3xl shadow-sm shadow-black/10",
        props.isCentered ? "w-full" : "min-w-0 flex-1",
      )}
    >
      <PressableFeedback
        onPress={props.onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={cn(
          "h-28 w-full overflow-hidden rounded-3xl border-2 border-white/55 active:opacity-90",
        )}
        animation={{
          scale: {
            value: 0.96,
            timingConfig: { duration: 150 },
          },
        }}
      >
        <LinearGradient
          colors={["rgba(91, 202, 186, 0.58)", "rgba(246, 187, 91, 0.68)"]}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 1, y: 0.65 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className={cn("bg-white/10")}
        />
        <View className={cn("flex-1 justify-end px-4 pb-4")}>
          <PlayerCountLabel count={props.count} />
        </View>
      </PressableFeedback>
    </Animated.View>
  );
}

export default function DialogMorePlayers(props: {
  selectedTeams: number | null;
  onSelectPlayerCount: (playerCount: number) => void;
  onOpenChange?: (isOpen: boolean) => void;
  plusButtonRectSv: SharedValue<TouchRect>;
}) {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const plusButtonRef = useRef<View>(null);
  const blurIntensity = useSharedValue(40);
  const handleOpenChange = (nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
    props.onOpenChange?.(nextIsOpen);
  };
  const handlePlayerCountSelection = (playerCount: number) => {
    props.onSelectPlayerCount(playerCount);
    handleOpenChange(false);
  };

  if (!props.selectedTeams) return null;

  return (
    <>
      <Button
        size="md"
        className={cn(
          "border border-white/60 rounded-full size-12 items-center justify-center px-0 overflow-hidden bg-gray-100/40 active:bg-gray-100/80 active:text-white",
        )}
        animation={{
          scale: {
            value: 0.96,
            timingConfig: { duration: 170 },
          },
          highlight: {
            backgroundColor: { value: "transparent" },
            opacity: { value: [0, 0] },
          },
        }}
        accessibilityRole="button"
        accessibilityLabel={t`Add more players`}
        accessibilityHint={t`Opens the player count picker`}
        onLayout={() => {
          plusButtonRef.current?.measureInWindow((x, y, width, height) => {
            props.plusButtonRectSv.set({
              x,
              y,
              width,
              height,
              isReady: true,
            });
          });
        }}
        ref={plusButtonRef}
        onPress={() => {
          handleOpenChange(true);
        }}
      >
        <AnimatedBlurView
          blurIntensity={blurIntensity}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className={cn("bg-white/15")}
        />
        <Button.Label className={cn("text-base font-semibold")}>
          +5
        </Button.Label>
      </Button>
      <ExpoBottomSheet
        index={isOpen ? 0 : -1}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: "#F4EDDE" }}
        onDismiss={() => handleOpenChange(false)}
      >
        <BottomSheetView>
          <View className={cn("px-5 pb-7")}>
            <View className={cn("mt-6 gap-3")}>
              {[PLAYER_COUNTS.slice(0, 2), PLAYER_COUNTS.slice(2, 4)].map(
                (row, rowIndex) => (
                  <View key={rowIndex} className={cn("flex-row gap-3")}>
                    {row.map((value, columnIndex) => {
                      const index = rowIndex * 2 + columnIndex;
                      return (
                        <PlayerCountOption
                          key={value}
                          count={value}
                          index={index}
                          onPress={() => handlePlayerCountSelection(value)}
                        />
                      );
                    })}
                  </View>
                ),
              )}
              <View className={cn("flex-row justify-center")}>
                <View style={{ width: "48%" }}>
                  <PlayerCountOption
                    count={10}
                    index={4}
                    isCentered
                    onPress={() => handlePlayerCountSelection(10)}
                  />
                </View>
              </View>
            </View>
          </View>
        </BottomSheetView>
      </ExpoBottomSheet>
    </>
  );
}
