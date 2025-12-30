import { AppText } from "@/src/components/app-text";
import { cn } from "heroui-native";
import { View } from "react-native";
import { PlayerCard } from "./player-card";

const GROUP_OPTIONS = [2, 3, 4, 5];

export default function TeamsSelection(props: {
  selectedTeams: number | null;
  setSelectedTeams: (teams: number) => void;
}) {
  if (props.selectedTeams) return null;

  return (
    <View className="flex-1 justify-center px-8 gap-4">
      <View className="w-full">
        <AppText
          className={cn("text-2xl tracking-tight text-foreground mb-2")}
          style={{ fontFamily: "SpaceMono" }}
        >
          How many teams?
        </AppText>
        <View className="flex-row flex-wrap -mx-2">
          {GROUP_OPTIONS.map((count, index) => {
            return (
              <PlayerCard
                key={count}
                count={count}
                index={index}
                isDisabled={false}
                onPress={() => {
                  props.setSelectedTeams(count);
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}
