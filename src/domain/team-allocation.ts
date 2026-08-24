import {
  getSelectedTeamNumbers,
  type RoundAssignment,
  type TeamNumber,
} from "./team-identity";

export const MAX_OBSERVED_PLAYER_COUNT = 12;

export type MultiRoundAssignmentPlan = {
  roundOne: RoundAssignment;
  roundTwo: RoundAssignment;
};

export type RandomSource = () => number;

export type TeamAllocationOptions = {
  pairingMode?: boolean;
};

const normalizeRandom = (random: RandomSource) => {
  const value = random();
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value - Math.floor(value);
};

const shuffle = <T>(values: T[], random: RandomSource): T[] => {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizeRandom(random) * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

const enumerateBalancedCountVectors = (
  teamCount: number,
  playerCount: number,
): number[][] => {
  const baseCount = Math.floor(playerCount / teamCount);
  const extraCount = playerCount % teamCount;
  const vectors: number[][] = [];
  const combinationCount = 2 ** teamCount;

  for (let mask = 0; mask < combinationCount; mask += 1) {
    let selectedExtras = 0;
    const vector = Array.from({ length: teamCount }, (_, index) => {
      const receivesExtra = (mask & (1 << index)) !== 0;
      if (receivesExtra) {
        selectedExtras += 1;
      }
      return baseCount + (receivesExtra ? 1 : 0);
    });

    if (selectedExtras === extraCount) {
      vectors.push(vector);
    }
  }

  return vectors;
};

const isBalanced = (counts: number[]) =>
  Math.max(...counts) - Math.min(...counts) <= 1;

const expandCounts = (
  counts: number[],
  teamNumbers: TeamNumber[],
): RoundAssignment =>
  counts.flatMap((count, index) =>
    Array.from({ length: count }, () => teamNumbers[index]),
  );

const selectRandom = <T>(values: T[], random: RandomSource): T => {
  if (values.length === 0) {
    throw new Error("No valid balanced allocation exists.");
  }

  const index = Math.floor(normalizeRandom(random) * values.length);
  return values[index];
};

const applyAllocationOptions = (
  assignment: RoundAssignment,
  options: TeamAllocationOptions,
): RoundAssignment => {
  if (!options.pairingMode || assignment.length < 3) {
    return assignment;
  }

  const result = [...assignment];
  const counts = new Map<TeamNumber, number>();
  result.forEach((teamNumber) => {
    counts.set(teamNumber, (counts.get(teamNumber) ?? 0) + 1);
  });
  const pairTeam =
    [result[1], result[2]].find(
      (teamNumber) => (counts.get(teamNumber) ?? 0) >= 2,
    ) ?? result.find((teamNumber) => (counts.get(teamNumber) ?? 0) >= 2);

  if (!pairTeam) {
    return assignment;
  }

  [1, 2].forEach((targetIndex) => {
    if (result[targetIndex] === pairTeam) {
      return;
    }

    const sourceIndex = result.findIndex(
      (teamNumber, index) =>
        teamNumber === pairTeam && index !== 1 && index !== 2,
    );
    [result[targetIndex], result[sourceIndex]] = [
      result[sourceIndex],
      result[targetIndex],
    ];
  });

  return result;
};

export const planBalancedRoundAssignment = (
  teamCount: number,
  playerCount: number,
  random: RandomSource = Math.random,
  options: TeamAllocationOptions = {},
): RoundAssignment => {
  if (
    !Number.isInteger(playerCount) ||
    playerCount < teamCount ||
    playerCount > MAX_OBSERVED_PLAYER_COUNT
  ) {
    throw new RangeError(
      `Player count must be an integer between ${teamCount} and ${MAX_OBSERVED_PLAYER_COUNT}.`,
    );
  }

  const teamNumbers = getSelectedTeamNumbers(teamCount);
  const counts = selectRandom(
    enumerateBalancedCountVectors(teamCount, playerCount),
    random,
  );

  return applyAllocationOptions(
    shuffle(expandCounts(counts, teamNumbers), random),
    options,
  );
};

export const planMultiRoundAssignments = (
  teamCount: number,
  declaredPlayerCount: number,
  random: RandomSource = Math.random,
  options: TeamAllocationOptions = {},
): MultiRoundAssignmentPlan => {
  if (
    !Number.isInteger(declaredPlayerCount) ||
    declaredPlayerCount < 6 ||
    declaredPlayerCount > 10
  ) {
    throw new RangeError(
      "Declared player count must be an integer between 6 and 10.",
    );
  }

  const teamNumbers = getSelectedTeamNumbers(teamCount);
  const roundOneVectors = enumerateBalancedCountVectors(teamCount, 5);
  const roundTwoVectors = enumerateBalancedCountVectors(
    teamCount,
    declaredPlayerCount - 5,
  );
  const validPairs = roundOneVectors.flatMap((roundOne) =>
    roundTwoVectors
      .filter((roundTwo) =>
        isBalanced(roundOne.map((count, index) => count + roundTwo[index])),
      )
      .map((roundTwo) => ({ roundOne, roundTwo })),
  );
  const selectedPair = selectRandom(validPairs, random);

  return {
    roundOne: applyAllocationOptions(
      shuffle(expandCounts(selectedPair.roundOne, teamNumbers), random),
      options,
    ),
    roundTwo: shuffle(expandCounts(selectedPair.roundTwo, teamNumbers), random),
  };
};
