import { describe, expect, it } from "vitest";
import {
  MAX_FLEXIBLE_PLAYER_COUNT,
  planBalancedRoundAssignment,
  planMultiRoundAssignments,
} from "./team-allocation";
import {
  TEAM_NUMBERS,
  getSelectedTeamNumbers,
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

describe("team identities", () => {
  it("keeps the canonical team-number order", () => {
    expect(TEAM_NUMBERS).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(TEAM_NUMBERS).size).toBe(TEAM_NUMBERS.length);
  });

  it("resolves selected teams in canonical order", () => {
    expect(getSelectedTeamNumbers(3)).toEqual([1, 2, 3]);
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

describe("pairing mode allocation", () => {
  for (const teamCount of [2, 3, 4, 5] as const) {
    for (
      let playerCount = Math.max(teamCount, 3);
      playerCount <= MAX_FLEXIBLE_PLAYER_COUNT;
      playerCount += 1
    ) {
      it(`handles flexible pairing mode with ${teamCount} teams and ${playerCount} players`, () => {
        const teamNumbers = getSelectedTeamNumbers(teamCount);
        const normalAssignments = planBalancedRoundAssignment(
          teamCount,
          playerCount,
          deterministicRandom(teamCount * 100 + playerCount),
        );
        const assignments = planBalancedRoundAssignment(
          teamCount,
          playerCount,
          deterministicRandom(teamCount * 100 + playerCount),
          { pairingMode: true },
        );

        if (playerCount === teamCount) {
          expect(assignments).toEqual(normalAssignments);
        } else {
          expect(assignments[2]).toBe(assignments[1]);
        }
        expectBalanced(countAssignments(assignments, teamNumbers));
      });
    }

    for (let playerCount = 6; playerCount <= 10; playerCount += 1) {
      it(`handles declared pairing mode with ${teamCount} teams and ${playerCount} players`, () => {
        const teamNumbers = getSelectedTeamNumbers(teamCount);
        const normalPlan = planMultiRoundAssignments(
          teamCount,
          playerCount,
          deterministicRandom(teamCount * 100 + playerCount),
        );
        const plan = planMultiRoundAssignments(
          teamCount,
          playerCount,
          deterministicRandom(teamCount * 100 + playerCount),
          { pairingMode: true },
        );

        if (teamCount === 5) {
          expect(plan).toEqual(normalPlan);
        } else {
          expect(plan.roundOne[2]).toBe(plan.roundOne[1]);
        }
        expect(plan.roundTwo).toHaveLength(playerCount - 5);
        expectBalanced(countAssignments(plan.roundOne, teamNumbers));
      });
    }
  }

  it("does not alter the deterministic normal allocation", () => {
    const normal = planBalancedRoundAssignment(4, 6, deterministicRandom(17));
    const disabled = planBalancedRoundAssignment(
      4,
      6,
      deterministicRandom(17),
      { pairingMode: false },
    );

    expect(disabled).toEqual(normal);
  });
});
