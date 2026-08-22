import type { TeamNumber } from "../domain/team-identity";

export type TeamShape = "spike" | "wave" | "hexagon" | "diamond" | "squircle";

export type TeamEncoding = {
  team: TeamNumber;
  color: string;
};

export type ShapedTeamEncoding = TeamEncoding & {
  shape: TeamShape;
};
