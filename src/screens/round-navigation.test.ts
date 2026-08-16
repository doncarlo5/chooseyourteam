import { describe, expect, it } from "vitest";
import {
  canNavigateRounds,
  didDragSettleWithoutMomentum,
  observeRoundSwipeThreshold,
  roundForSettledOffset,
} from "./round-navigation";

describe("Round navigation", () => {
  it("emits its threshold exactly once without per-frame events", () => {
    const initial = { hasEmitted: false };
    const before = observeRoundSwipeThreshold(initial, 49, 100);
    const crossed = observeRoundSwipeThreshold(before.state, 50, 100);
    const later = observeRoundSwipeThreshold(crossed.state, 90, 100);

    expect(before.didCross).toBe(false);
    expect(crossed.didCross).toBe(true);
    expect(later.didCross).toBe(false);
  });

  it("clamps settled offsets to the two semantic Rounds", () => {
    expect(roundForSettledOffset(-200, 100)).toBe(0);
    expect(roundForSettledOffset(60, 100)).toBe(1);
    expect(roundForSettledOffset(900, 100)).toBe(1);
    expect(roundForSettledOffset(10, 0)).toBe(0);
  });

  it("ends a drag with no momentum and gates interaction during touches", () => {
    expect(didDragSettleWithoutMomentum(0)).toBe(true);
    expect(didDragSettleWithoutMomentum(undefined)).toBe(true);
    expect(didDragSettleWithoutMomentum(0.4)).toBe(false);
    expect(canNavigateRounds(true, false)).toBe(true);
    expect(canNavigateRounds(true, true)).toBe(false);
    expect(canNavigateRounds(false, false)).toBe(false);
  });
});
