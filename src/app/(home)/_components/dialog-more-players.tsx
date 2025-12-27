import { Picker } from "@react-native-picker/picker";
import { Button, Dialog, cn } from "heroui-native";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { DialogBlurBackdrop } from "../../../components/dialog-blur-backdrop";
import type { TouchRect } from "../../../helpers/types/home-screen";

export default function DialogMorePlayers({
  selectedTeams,
  isDark,
  totalPlayers,
  setTotalPlayers,
  plusButtonRectSv,
}: {
  selectedTeams: number | null;
  isDark: boolean;
  totalPlayers: number;
  setTotalPlayers: Dispatch<SetStateAction<number>>;
  plusButtonRectSv: SharedValue<TouchRect>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingTotalPlayers, setPendingTotalPlayers] = useState(totalPlayers);
  const plusButtonRef = useRef<View>(null);

  if (!selectedTeams) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(isOpen) => {
        setIsOpen(isOpen);
        if (isOpen) {
          setPendingTotalPlayers(totalPlayers);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button
          size="md"
          className={cn(
            "rounded-full size-12 items-center justify-center px-0",
            isDark ? "bg-[#E4E4E4]/50" : "bg-[#0B0B0B]/50"
          )}
          onLayout={() => {
            plusButtonRef.current?.measureInWindow((x, y, width, height) => {
              plusButtonRectSv.value = {
                x,
                y,
                width,
                height,
                isReady: true,
              };
            });
          }}
          ref={plusButtonRef}
        >
          <Button.Label
            className={cn(
              "text-base font-semibold",
              isDark ? "text-[#0B0B0B]" : "text-white"
            )}
          >
            +5
          </Button.Label>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <DialogBlurBackdrop />
        <Dialog.Content className="max-w-sm mx-auto">
          <Dialog.Close className="self-end -mb-2 z-50" />
          <View className="mb-4 gap-1">
            <Dialog.Title>Players</Dialog.Title>
            <Dialog.Description>Choose total players (5-10)</Dialog.Description>
          </View>
          <View
            className={cn(
              "rounded-2xl overflow-hidden",
              isDark ? "bg-white/10" : "bg-black/10"
            )}
          >
            <Picker
              selectedValue={pendingTotalPlayers}
              onValueChange={(value) => {
                setPendingTotalPlayers(value);
              }}
              style={{ color: isDark ? "white" : "black" }}
            >
              {Array.from({ length: 6 }, (_, index) => index + 5).map(
                (value) => (
                  <Picker.Item
                    key={value}
                    label={`${value} players`}
                    value={value}
                  />
                )
              )}
            </Picker>
          </View>
          <Button
            className="mt-4"
            onPress={() => {
              setTotalPlayers(pendingTotalPlayers);
              setIsOpen(false);
            }}
          >
            <Button.Label className="font-semibold">Confirm</Button.Label>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
