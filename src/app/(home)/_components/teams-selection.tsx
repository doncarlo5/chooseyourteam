import { View } from "react-native";
import { AppText } from "../../../components/app-text";
import { PlayerCard } from "./player-card";

const GROUP_OPTIONS = [2, 3, 4, 5];

export default function TeamsSelection(props: {
  selectedTeams: number | null;
  setSelectedTeams: (teams: number) => void;
  isDark: boolean;
}) {
  if (props.selectedTeams) return null;

  return (
    <View className="flex-1 justify-center px-8 gap-4">
      <View className="w-full">
        <AppText className="text-xl font-semibold text-foreground mb-2">
          How many teams?
        </AppText>
        <View className="flex-row flex-wrap -mx-2">
          {GROUP_OPTIONS.map((count, index) => {
            return (
              <PlayerCard
                key={count}
                count={count}
                index={index}
                isDark={props.isDark}
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
