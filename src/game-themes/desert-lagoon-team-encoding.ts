import type { TeamNumber } from "../domain/team-identity";
import type { ShapedTeamEncoding } from "./team-encoding";

export const DESERT_LAGOON_TEAM_ENCODINGS = [
  { team: 1, color: "#415679", shape: "spike" },
  { team: 2, color: "#FB7185", shape: "wave" },
  { team: 3, color: "#512663", shape: "hexagon" },
  { team: 4, color: "#E11D48", shape: "diamond" },
  { team: 5, color: "#9D659F", shape: "squircle" },
] as const satisfies readonly ShapedTeamEncoding[];

export function getDesertLagoonTeamEncoding(
  team: TeamNumber,
): ShapedTeamEncoding {
  return DESERT_LAGOON_TEAM_ENCODINGS[team - 1];
}
