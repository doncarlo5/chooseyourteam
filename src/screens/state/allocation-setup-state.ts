import {
  MAX_OBSERVED_PLAYER_COUNT,
  MAX_PLANNED_ROUND_PLAYER_COUNT,
} from "../../domain/team-allocation";
import type { PlatformOSType } from "react-native";

export const DECLARED_PLAYER_COUNTS = [6, 7, 8, 9, 10] as const;

export type DeclaredPlayerCount = (typeof DECLARED_PLAYER_COUNTS)[number];
export type SelectedTeamCount = 2 | 3 | 4 | 5;

export type PlayerSelection =
  { mode: "observed" } | { mode: "declared"; count: DeclaredPlayerCount };

export type AllocationSetupPolicy = {
  showsPlayerSelection: boolean;
  sessionPlayerSelection: PlayerSelection;
  maximumObservedPlayerCount:
    typeof MAX_PLANNED_ROUND_PLAYER_COUNT | typeof MAX_OBSERVED_PLAYER_COUNT;
};

export type AllocationSessionConfiguration = {
  selectedTeams: SelectedTeamCount;
  playerSelection: PlayerSelection;
  maximumObservedPlayerCount:
    typeof MAX_PLANNED_ROUND_PLAYER_COUNT | typeof MAX_OBSERVED_PLAYER_COUNT;
  isPairingModeEnabled: boolean;
};

export const DEFAULT_PLAYER_SELECTION: PlayerSelection = { mode: "observed" };
export const DEFAULT_SELECTED_TEAMS: SelectedTeamCount = 2;

export const getAllocationSetupPolicy = (
  platform: PlatformOSType,
  playerSelection: PlayerSelection,
): AllocationSetupPolicy => {
  if (platform === "android") {
    return {
      showsPlayerSelection: false,
      sessionPlayerSelection: DEFAULT_PLAYER_SELECTION,
      maximumObservedPlayerCount: MAX_OBSERVED_PLAYER_COUNT,
    };
  }

  return {
    showsPlayerSelection: true,
    sessionPlayerSelection: playerSelection,
    maximumObservedPlayerCount: MAX_PLANNED_ROUND_PLAYER_COUNT,
  };
};

export const incrementPlayerSelection = (
  selection: PlayerSelection,
): PlayerSelection => {
  if (selection.mode === "observed") {
    return { mode: "declared", count: 6 };
  }

  if (selection.count >= 10) {
    return selection;
  }

  return {
    mode: "declared",
    count: (selection.count + 1) as DeclaredPlayerCount,
  };
};

export const decrementPlayerSelection = (
  selection: PlayerSelection,
): PlayerSelection => {
  if (selection.mode === "observed") {
    return selection;
  }

  if (selection.count === 6) {
    return DEFAULT_PLAYER_SELECTION;
  }

  return {
    mode: "declared",
    count: (selection.count - 1) as DeclaredPlayerCount,
  };
};

export const incrementSelectedTeams = (
  selectedTeams: SelectedTeamCount,
): SelectedTeamCount => Math.min(5, selectedTeams + 1) as SelectedTeamCount;

export const decrementSelectedTeams = (
  selectedTeams: SelectedTeamCount,
): SelectedTeamCount => Math.max(2, selectedTeams - 1) as SelectedTeamCount;

export const normalizeSelectedTeams = (
  selectedTeams: SelectedTeamCount,
  playerSelection: PlayerSelection,
): SelectedTeamCount => {
  const maximumTeams =
    playerSelection.mode === "observed"
      ? 5
      : Math.min(5, playerSelection.count);

  return Math.min(selectedTeams, maximumTeams) as SelectedTeamCount;
};

export const getPlayerSelectionLabel = (selection: PlayerSelection): string =>
  selection.mode === "observed" ? "5+" : String(selection.count);
