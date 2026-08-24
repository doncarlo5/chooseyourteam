import { StatusBar } from "expo-status-bar";
import { useGameTheme } from "../game-themes/game-theme-provider";
import { cn } from "heroui-native";
import { useState } from "react";
import { Platform, View } from "react-native";
import AllocationSessionScreen from "./components/allocation-session-screen";
import AllocationSetup from "./components/allocation-setup";
import AppInfoButton from "./components/app-info-button";
import AppReviewButton from "./components/app-review-button";
import AppShareButton from "./components/app-share-button";
import {
  DEFAULT_PLAYER_SELECTION,
  DEFAULT_SELECTED_TEAMS,
  decrementPlayerSelection,
  decrementSelectedTeams,
  incrementPlayerSelection,
  incrementSelectedTeams,
  getAllocationSetupPolicy,
  normalizeSelectedTeams,
  type AllocationSessionConfiguration,
  type PlayerSelection,
  type SelectedTeamCount,
} from "./state/allocation-setup-state";
import { H } from "./utils/helper";

export default function Home() {
  const { theme } = useGameTheme();
  const [playerSelection, setPlayerSelection] = useState<PlayerSelection>(
    DEFAULT_PLAYER_SELECTION,
  );
  const [selectedTeams, setSelectedTeams] = useState<SelectedTeamCount>(
    DEFAULT_SELECTED_TEAMS,
  );
  const [isPairingModeEnabled, setIsPairingModeEnabled] = useState(false);
  const [activeConfiguration, setActiveConfiguration] =
    useState<AllocationSessionConfiguration | null>(null);
  const setupPolicy = getAllocationSetupPolicy(Platform.OS, playerSelection);

  const handlePairingModeChange = (isEnabled: boolean) => {
    setIsPairingModeEnabled(isEnabled);
    void (isEnabled ? H.pairingModeOn() : H.pairingModeOff());
  };
  const handleStart = () => {
    setActiveConfiguration({
      playerSelection: setupPolicy.sessionPlayerSelection,
      selectedTeams,
      isPairingModeEnabled,
    });
  };
  const handlePlayerSelectionChange = (nextSelection: PlayerSelection) => {
    setPlayerSelection(nextSelection);
    setSelectedTeams((teams) => normalizeSelectedTeams(teams, nextSelection));
  };
  const handleSessionExit = () => {
    setActiveConfiguration(null);
    setIsPairingModeEnabled(false);
  };

  return (
    <View
      testID="home-screen"
      className={cn("flex-1")}
      style={{ backgroundColor: theme.chrome.screenBackgroundColor }}
    >
      <theme.Background />
      {activeConfiguration === null ? (
        <>
          <AllocationSetup
            playerSelection={playerSelection}
            showsPlayerSelection={setupPolicy.showsPlayerSelection}
            selectedTeams={selectedTeams}
            isPairingModeEnabled={isPairingModeEnabled}
            onDecrementPlayers={() =>
              handlePlayerSelectionChange(
                decrementPlayerSelection(playerSelection),
              )
            }
            onIncrementPlayers={() =>
              handlePlayerSelectionChange(
                incrementPlayerSelection(playerSelection),
              )
            }
            onDecrementTeams={() =>
              setSelectedTeams((teams) => decrementSelectedTeams(teams))
            }
            onIncrementTeams={() =>
              setSelectedTeams((teams) => incrementSelectedTeams(teams))
            }
            onPairingModeChange={handlePairingModeChange}
            onStart={handleStart}
          />
          <AppInfoButton />
          <AppShareButton />
        </>
      ) : (
        <AllocationSessionScreen
          configuration={activeConfiguration}
          onExit={handleSessionExit}
        />
      )}
      <AppReviewButton isVisible={activeConfiguration === null} />
      <StatusBar style={theme.chrome.statusBarStyle} />
    </View>
  );
}
