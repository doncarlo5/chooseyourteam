import type { TeamNumber } from "../domain/team-identity";
import type { TeamEncoding } from "./team-encoding";

export const NEON_ARENA_TEAM_ENCODINGS = [
  { team: 1, color: "#FF3B5C" },
  { team: 2, color: "#39FF88" },
  { team: 3, color: "#FFE34D" },
  { team: 4, color: "#26D9FF" },
  { team: 5, color: "#B66CFF" },
] as const satisfies readonly TeamEncoding[];

export function getNeonArenaTeamEncoding(team: TeamNumber): TeamEncoding {
  return NEON_ARENA_TEAM_ENCODINGS[team - 1];
}
