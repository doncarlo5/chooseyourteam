import { StatusBar } from "expo-status-bar";
import { useGameTheme } from "../game-themes/game-theme-provider";
import { cn } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import AllocationSessionScreen, {
  type AllocationSessionConfiguration,
} from "./components/allocation-session-screen";
import AppInfoButton from "./components/app-info-button";
import AppReviewButton from "./components/app-review-button";
import AppShareButton from "./components/app-share-button";
import TeamsSelection from "./components/teams-selection";
import { H } from "./utils/helper";

const isSupportedTeamCount = (
  teamCount: number,
): teamCount is AllocationSessionConfiguration["selectedTeams"] =>
  teamCount >= 2 && teamCount <= 5;

export default function Home() {
  const { theme } = useGameTheme();
  const [selectedTeams, setSelectedTeams] = useState<
    AllocationSessionConfiguration["selectedTeams"] | null
  >(null);
  const [isPairingModeEnabled, setIsPairingModeEnabled] = useState(false);

  const handleTeamSelection = (teamCount: number) => {
    if (isSupportedTeamCount(teamCount)) {
      setSelectedTeams(teamCount);
    }
  };
  const handlePairingModeChange = (isEnabled: boolean) => {
    setIsPairingModeEnabled(isEnabled);
    void (isEnabled ? H.pairingModeOn() : H.pairingModeOff());
  };
  const handleSessionExit = () => {
    setSelectedTeams(null);
    setIsPairingModeEnabled(false);
  };

  return (
    <View
      testID="home-screen"
      className={cn("flex-1")}
      style={{ backgroundColor: theme.chrome.screenBackgroundColor }}
    >
      <theme.Background />
      {selectedTeams === null ? (
        <>
          <TeamsSelection
            selectedTeams={selectedTeams}
            isPairingModeEnabled={isPairingModeEnabled}
            onSelectTeams={handleTeamSelection}
            onPairingModeChange={handlePairingModeChange}
          />
          <AppInfoButton />
          <AppShareButton />
        </>
      ) : (
        <AllocationSessionScreen
          configuration={{ selectedTeams, isPairingModeEnabled }}
          onExit={handleSessionExit}
        />
      )}
      <AppReviewButton isVisible={selectedTeams === null} />
      <StatusBar style={theme.chrome.statusBarStyle} />
    </View>
  );
}
