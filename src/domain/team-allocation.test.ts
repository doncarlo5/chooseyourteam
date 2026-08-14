import { describe, expect, it } from "vitest";
import {
  MAX_FLEXIBLE_PLAYER_COUNT,
  planBalancedRoundAssignment,
  planMultiRoundAssignments,
} from "./team-allocation";
import {
  TEAM_IDENTITIES,
  getSelectedTeamNumbers,
  getTeamIdentity,
  type TeamNumber,
} from "./team-identity";

const countAssignments = (
  assignments: TeamNumber[],
  teamNumbers: TeamNumber[],
) =>
  teamNumbers.map(
    (teamNumber) =>
      assignments.filter((assignment) => assignment === teamNumber).length,
  );

const expectBalanced = (counts: number[]) => {
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
};

const deterministicRandom = (seed: number) => {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

describe("canonical team identities", () => {
  it("keeps the exact number, color, and shape mapping", () => {
    expect(TEAM_IDENTITIES).toEqual([
      { number: 1, color: "#415679", shape: "spike" },
      { number: 2, color: "#FB7185", shape: "wave" },
      { number: 3, color: "#512663", shape: "hexagon" },
      { number: 4, color: "#E11D48", shape: "diamond" },
      { number: 5, color: "#9D659F", shape: "squircle" },
    ]);
  });

  it("keeps every identity field unique", () => {
    expect(
      new Set(TEAM_IDENTITIES.map((identity) => identity.number)).size,
    ).toBe(TEAM_IDENTITIES.length);
    expect(
      new Set(TEAM_IDENTITIES.map((identity) => identity.color)).size,
    ).toBe(TEAM_IDENTITIES.length);
    expect(
      new Set(TEAM_IDENTITIES.map((identity) => identity.shape)).size,
    ).toBe(TEAM_IDENTITIES.length);
  });

  it("resolves selected teams in canonical order", () => {
    expect(getSelectedTeamNumbers(3)).toEqual([1, 2, 3]);
    expect(getTeamIdentity(4)).toEqual({
      number: 4,
      color: "#E11D48",
      shape: "diamond",
    });
  });
});

describe("multi-round allocation", () => {
  for (const teamCount of [2, 3, 4, 5] as const) {
    for (let totalPlayers = 6; totalPlayers <= 10; totalPlayers += 1) {
      for (const seed of [1, 17, 2026]) {
        it(`balances ${totalPlayers} players across ${teamCount} teams with seed ${seed}`, () => {
          const teamNumbers = getSelectedTeamNumbers(teamCount);
          const plan = planMultiRoundAssignments(
            teamCount,
            totalPlayers,
            deterministicRandom(seed),
          );

          expect(plan.roundOne).toHaveLength(5);
          expect(plan.roundTwo).toHaveLength(totalPlayers - 5);
          expect(
            [...plan.roundOne, ...plan.roundTwo].every((assignment) =>
              teamNumbers.includes(assignment),
            ),
          ).toBe(true);

          const roundOneCounts = countAssignments(plan.roundOne, teamNumbers);
          const roundTwoCounts = countAssignments(plan.roundTwo, teamNumbers);
          const combinedCounts = roundOneCounts.map(
            (count, index) => count + roundTwoCounts[index],
          );

          expectBalanced(roundOneCounts);
          expectBalanced(roundTwoCounts);
          expectBalanced(combinedCounts);
        });
      }
    }
  }
});

describe("flexible single-round allocation", () => {
  for (const teamCount of [2, 3, 4, 5] as const) {
    for (
      let playerCount = teamCount;
      playerCount <= MAX_FLEXIBLE_PLAYER_COUNT;
      playerCount += 1
    ) {
      it(`balances ${playerCount} touches across ${teamCount} teams`, () => {
        const teamNumbers = getSelectedTeamNumbers(teamCount);
        const assignments = planBalancedRoundAssignment(
          teamCount,
          playerCount,
          deterministicRandom(teamCount * 100 + playerCount),
        );

        expect(assignments).toHaveLength(playerCount);
        expect(
          assignments.every((assignment) => teamNumbers.includes(assignment)),
        ).toBe(true);
        expectBalanced(countAssignments(assignments, teamNumbers));
      });
    }
  }
});

describe("inséparable allocation", () => {
  for (const teamCount of [2, 3, 4, 5] as const) {
    for (
      let playerCount = Math.max(teamCount, 3);
      playerCount <= MAX_FLEXIBLE_PLAYER_COUNT;
      playerCount += 1
    ) {
      it(`puts flexible players 2 and 3 together with ${teamCount} teams and ${playerCount} players`, () => {
        const teamNumbers = getSelectedTeamNumbers(teamCount);
        const assignments = planBalancedRoundAssignment(
          teamCount,
          playerCount,
          deterministicRandom(teamCount * 100 + playerCount),
          { inseparable: true },
        );

        expect(assignments[2]).toBe(assignments[1]);
        if (playerCount > teamCount) {
          expectBalanced(countAssignments(assignments, teamNumbers));
        }
      });
    }

    for (let playerCount = 6; playerCount <= 10; playerCount += 1) {
      it(`puts declared players 2 and 3 together with ${teamCount} teams and ${playerCount} players`, () => {
        const teamNumbers = getSelectedTeamNumbers(teamCount);
        const plan = planMultiRoundAssignments(
          teamCount,
          playerCount,
          deterministicRandom(teamCount * 100 + playerCount),
          { inseparable: true },
        );

        expect(plan.roundOne[2]).toBe(plan.roundOne[1]);
        expect(plan.roundTwo).toHaveLength(playerCount - 5);
        if (teamCount < 5) {
          expectBalanced(countAssignments(plan.roundOne, teamNumbers));
        }
      });
    }
  }

  it("does not alter the deterministic normal allocation", () => {
    const normal = planBalancedRoundAssignment(4, 6, deterministicRandom(17));
    const disabled = planBalancedRoundAssignment(
      4,
      6,
      deterministicRandom(17),
      { inseparable: false },
    );

    expect(disabled).toEqual(normal);
  });
});
