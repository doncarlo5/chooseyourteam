import type { ShapedTeamEncoding } from "./team-encoding";

export const CORAL_SKY_TEAM_ENCODINGS = [
  { team: 1, color: "#2563EB", shape: "spike" },
  { team: 2, color: "#F97316", shape: "wave" },
  { team: 3, color: "#7C3AED", shape: "hexagon" },
  { team: 4, color: "#DB2777", shape: "diamond" },
  { team: 5, color: "#0F766E", shape: "squircle" },
] as const satisfies readonly ShapedTeamEncoding[];
