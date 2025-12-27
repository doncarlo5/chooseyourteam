import { StatusBar } from "expo-status-bar";
import { cn } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { AppText } from "../../components/app-text";
import { ThemeToggle } from "../../components/theme-toggle";
import { useAppTheme } from "../../contexts/app-theme-context";
import type { TouchRect } from "../../helpers/types/home-screen";
// import DialogMorePlayers from "./_components/dialog-more-players";
import { useSelectedPlayersLayer } from "./_components/selected-players-layer";
import TeamsSelection from "./_components/teams-selection";

export default function App() {
  const { isDark } = useAppTheme();

  const [selectedTeams, setSelectedTeams] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(5);

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
  const { touchGesture, overlay, isRevealed, isTouching } =
    useSelectedPlayersLayer({
      selectedTeams,
      isDark,
      toggleRectSv,
      plusButtonRectSv,
      onBack: () => {
        setSelectedTeams(null);
        setTotalPlayers(5);
      },
    });

  if (!selectedTeams) {
    return (
      <View className={cn("flex-1", isDark ? "bg-[#0B0B0B]" : "bg-[#E4E4E4]")}>
        <View className="absolute top-16 right-6 z-10 items-center gap-2">
          <ThemeToggle
            selectedTeams={selectedTeams}
            toggleRectSv={toggleRectSv}
          />
        </View>

        <TeamsSelection
          selectedTeams={selectedTeams}
          setSelectedTeams={setSelectedTeams}
          isDark={isDark}
        />

        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <GestureDetector gesture={touchGesture}>
      <View className={cn("flex-1", isDark ? "bg-[#0B0B0B]" : "bg-[#E4E4E4]")}>
        {totalPlayers > 5 && (
          <View className="absolute inset-0 items-center justify-center pointer-events-none">
            <AppText
              className={cn(
                "text-6xl font-semibold",
                isDark ? "text-white/20" : "text-black/20"
              )}
            >
              {totalPlayers} players
            </AppText>
          </View>
        )}
        {/* +5 button (feature coming soon)
        <View className="absolute top-16 right-6 z-10 items-center gap-2">
          <DialogMorePlayers
            selectedTeams={selectedTeams}
            isDark={isDark}
            setTotalPlayers={setTotalPlayers}
            plusButtonRectSv={plusButtonRectSv}
            isRevealed={isRevealed}
            isTouching={isTouching}
          />
        </View>
        */}
        {overlay}
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    </GestureDetector>
  );
}
