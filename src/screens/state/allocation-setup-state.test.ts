import { describe, expect, it } from "vitest";
import {
  MAX_OBSERVED_PLAYER_COUNT,
  MAX_PLANNED_ROUND_PLAYER_COUNT,
} from "../../domain/team-allocation";
import {
  DEFAULT_PLAYER_SELECTION,
  DEFAULT_SELECTED_TEAMS,
  decrementPlayerSelection,
  decrementSelectedTeams,
  getAllocationSetupPolicy,
  getPlayerSelectionLabel,
  incrementPlayerSelection,
  incrementSelectedTeams,
  normalizeSelectedTeams,
  type PlayerSelection,
} from "./allocation-setup-state";

describe("allocation setup state", () => {
  it("starts with the observed player selection and two teams", () => {
    expect(DEFAULT_PLAYER_SELECTION).toEqual({ mode: "observed" });
    expect(DEFAULT_SELECTED_TEAMS).toBe(2);
    expect(getPlayerSelectionLabel(DEFAULT_PLAYER_SELECTION)).toBe("5+");
  });

  it("moves from the observed selection through every declared count", () => {
    const selections: PlayerSelection[] = [DEFAULT_PLAYER_SELECTION];

    for (let index = 0; index < 5; index += 1) {
      selections.push(incrementPlayerSelection(selections.at(-1)!));
    }

    expect(selections).toEqual([
      { mode: "observed" },
      { mode: "declared", count: 6 },
      { mode: "declared", count: 7 },
      { mode: "declared", count: 8 },
      { mode: "declared", count: 9 },
      { mode: "declared", count: 10 },
    ]);
    expect(incrementPlayerSelection(selections.at(-1)!)).toBe(
      selections.at(-1),
    );
  });

  it("moves back from declared counts to the observed selection", () => {
    let selection: PlayerSelection = { mode: "declared", count: 10 };

    for (let count = 9; count >= 6; count -= 1) {
      selection = decrementPlayerSelection(selection);
      expect(selection).toEqual({ mode: "declared", count });
    }

    selection = decrementPlayerSelection(selection);
    expect(selection).toEqual({ mode: "observed" });
    expect(decrementPlayerSelection(selection)).toBe(selection);
  });

  it("keeps the team selection between two and five", () => {
    expect(decrementSelectedTeams(2)).toBe(2);
    expect(incrementSelectedTeams(2)).toBe(3);
    expect(decrementSelectedTeams(5)).toBe(4);
    expect(incrementSelectedTeams(5)).toBe(5);
  });

  it("normalizes Teams against every Player selection", () => {
    expect(normalizeSelectedTeams(5, { mode: "observed" })).toBe(5);
    expect(normalizeSelectedTeams(5, { mode: "declared", count: 6 })).toBe(5);
  });

  it("hides Player selection and forces observed Players on Android", () => {
    expect(
      getAllocationSetupPolicy("android", { mode: "declared", count: 8 }),
    ).toEqual({
      showsPlayerSelection: false,
      sessionPlayerSelection: { mode: "observed" },
      maximumObservedPlayerCount: MAX_OBSERVED_PLAYER_COUNT,
    });
  });

  it.each(["ios", "web"] as const)(
    "keeps Player selection visible on %s",
    (platform) => {
      const selection: PlayerSelection = { mode: "declared", count: 8 };
      expect(getAllocationSetupPolicy(platform, selection)).toEqual({
        showsPlayerSelection: true,
        sessionPlayerSelection: selection,
        maximumObservedPlayerCount: MAX_PLANNED_ROUND_PLAYER_COUNT,
      });
    },
  );
});
