import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import { DialogBlurBackdrop } from "@/src/components/dialog-blur-backdrop";
import type { TouchRect } from "@/src/helpers/types/home-screen";
import { Button, Dialog, cn } from "heroui-native";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { StyleSheet, View } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import { PlayerCard } from "./player-card";

export default function DialogMorePlayers(props: {
  selectedTeams: number | null;
  setTotalPlayers: Dispatch<SetStateAction<number>>;
  plusButtonRectSv: SharedValue<TouchRect>;
  isRevealed: boolean;
  isTouching: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const plusButtonRef = useRef<View>(null);
  const blurIntensity = useSharedValue(40);

  if (!props.selectedTeams || props.isRevealed || props.isTouching) return null;

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        size="md"
        className={cn(
          "rounded-full size-12 items-center justify-center px-0 overflow-hidden",
          "bg-white/10 border-2 border-white/30"
        )}
        animation={{
          scale: {
            timingConfig: { duration: 120 },
          },
          highlight: {
            backgroundColor: { value: "transparent" },
            opacity: { value: [0, 0] },
          },
        }}
        accessibilityRole="button"
        accessibilityLabel="Add more players"
        accessibilityHint="Opens the player count picker"
        onLayout={() => {
          plusButtonRef.current?.measureInWindow((x, y, width, height) => {
            props.plusButtonRectSv.value = {
              x,
              y,
              width,
              height,
              isReady: true,
            };
          });
        }}
        ref={plusButtonRef}
        onPress={() => {
          setIsOpen(true);
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
          className="bg-white/15"
        />
        <Button.Label className={cn("text-base font-semibold text-white")}>
          +5
        </Button.Label>
      </Button>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <Dialog.Content className={cn("max-w-sm mx-auto bg-[#E4E4E4]")}>
          <Dialog.Close className="self-end -mb-2 z-50" />
          <View className="mb-4 gap-1">
            <Dialog.Title>Pick a number</Dialog.Title>
          </View>
          <View className="flex-row flex-wrap -mx-2">
            {Array.from({ length: 5 }, (_, index) => index + 6).map(
              (value, idx) => (
                <PlayerCard
                  key={value}
                  count={value}
                  index={idx}
                  isDisabled={false}
                  label="players"
                  onPress={() => {
                    props.setTotalPlayers(value);
                    setIsOpen(false);
                  }}
                />
              )
            )}
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
