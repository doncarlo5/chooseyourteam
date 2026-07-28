export type TeamNumber = 1 | 2 | 3 | 4 | 5;

export type TeamShape = "spike" | "wave" | "hexagon" | "diamond" | "squircle";

export type TeamIdentity = {
  number: TeamNumber;
  color: string;
  shape: TeamShape;
};

export type RoundAssignment = TeamNumber[];

export const TEAM_IDENTITIES = [
  { number: 1, color: "#415679", shape: "spike" },
  { number: 2, color: "#FB7185", shape: "wave" },
  { number: 3, color: "#512663", shape: "hexagon" },
  { number: 4, color: "#E11D48", shape: "diamond" },
  { number: 5, color: "#9D659F", shape: "squircle" },
] as const satisfies readonly TeamIdentity[];

export const getTeamIdentity = (teamNumber: TeamNumber): TeamIdentity =>
  TEAM_IDENTITIES[teamNumber - 1];

export const getSelectedTeamNumbers = (teamCount: number): TeamNumber[] => {
  if (!Number.isInteger(teamCount) || teamCount < 1 || teamCount > 5) {
    throw new RangeError("Team count must be an integer between 1 and 5.");
  }

  return TEAM_IDENTITIES.slice(0, teamCount).map((identity) => identity.number);
};
