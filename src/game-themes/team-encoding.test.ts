import { describe, expect, it } from "vitest";
import {
  DESERT_LAGOON_TEAM_ENCODINGS,
  getDesertLagoonTeamEncoding,
} from "./desert-lagoon-team-encoding";
import {
  NEON_ARENA_TEAM_ENCODINGS,
  getNeonArenaTeamEncoding,
} from "./neon-arena-team-encoding";

describe("team encodings", () => {
  it("preserves the Desert Lagoon encoding", () => {
    expect(DESERT_LAGOON_TEAM_ENCODINGS).toEqual([
      { team: 1, color: "#415679", shape: "spike" },
      { team: 2, color: "#FB7185", shape: "wave" },
      { team: 3, color: "#512663", shape: "hexagon" },
      { team: 4, color: "#E11D48", shape: "diamond" },
      { team: 5, color: "#9D659F", shape: "squircle" },
    ]);
    expect(getDesertLagoonTeamEncoding(4)).toEqual({
      team: 4,
      color: "#E11D48",
      shape: "diamond",
    });
  });

  it("defines the shape-free Neon Arena palette", () => {
    expect(NEON_ARENA_TEAM_ENCODINGS).toEqual([
      { team: 1, color: "#FF3B5C" },
      { team: 2, color: "#39FF88" },
      { team: 3, color: "#FFE34D" },
      { team: 4, color: "#26D9FF" },
      { team: 5, color: "#B66CFF" },
    ]);
    expect(
      NEON_ARENA_TEAM_ENCODINGS.every((encoding) => !("shape" in encoding)),
    ).toBe(true);
    expect(getNeonArenaTeamEncoding(5)).toEqual({
      team: 5,
      color: "#B66CFF",
    });
  });

  it("keeps every theme encoding complete and uniquely ordered", () => {
    for (const encodings of [
      DESERT_LAGOON_TEAM_ENCODINGS,
      NEON_ARENA_TEAM_ENCODINGS,
    ]) {
      expect(encodings.map((encoding) => encoding.team)).toEqual([
        1, 2, 3, 4, 5,
      ]);
      expect(new Set(encodings.map((encoding) => encoding.color)).size).toBe(5);
    }
  });
});
