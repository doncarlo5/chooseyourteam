export type TeamNumber = 1 | 2 | 3 | 4 | 5;

export type RoundAssignment = TeamNumber[];

export const TEAM_NUMBERS = [1, 2, 3, 4, 5] as const satisfies readonly TeamNumber[];

export const getSelectedTeamNumbers = (teamCount: number): TeamNumber[] => {
  if (!Number.isInteger(teamCount) || teamCount < 1 || teamCount > 5) {
    throw new RangeError("Team count must be an integer between 1 and 5.");
  }

  return TEAM_NUMBERS.slice(0, teamCount);
};
