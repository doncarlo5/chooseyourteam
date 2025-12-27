import { Button, Dialog, cn } from "heroui-native";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { DialogBlurBackdrop } from "../../../components/dialog-blur-backdrop";
import type { TouchRect } from "../../../helpers/types/home-screen";
import { PlayerCard } from "./player-card";

export default function DialogMorePlayers(props: {
  selectedTeams: number | null;
  isDark: boolean;
  setTotalPlayers: Dispatch<SetStateAction<number>>;
  plusButtonRectSv: SharedValue<TouchRect>;
  isRevealed: boolean;
  isTouching: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const plusButtonRef = useRef<View>(null);

  if (!props.selectedTeams || props.isRevealed || props.isTouching) return null;

  return (
    <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        size="md"
        className={cn(
          "rounded-full size-12 items-center justify-center px-0",
          props.isDark ? "bg-[#E4E4E4]/50" : "bg-[#0B0B0B]/50"
        )}
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
        <Button.Label
          className={cn(
            "text-base font-semibold",
            props.isDark ? "text-[#0B0B0B]" : "text-white"
          )}
        >
          +5
        </Button.Label>
      </Button>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <Dialog.Content
          className={cn(
            "max-w-sm mx-auto",
            props.isDark ? "bg-[#0B0B0B]" : "bg-[#E4E4E4]"
          )}
        >
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
                  isDark={props.isDark}
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
