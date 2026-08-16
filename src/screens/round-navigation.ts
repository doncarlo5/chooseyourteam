import type { AllocationRound } from "./state/allocation-session-state";

export type RoundThresholdState = {
  hasEmitted: boolean;
};

export const observeRoundSwipeThreshold = (
  state: RoundThresholdState,
  offset: number,
  pageWidth: number,
) => {
  if (state.hasEmitted || pageWidth <= 0 || offset < pageWidth * 0.5) {
    return { state, didCross: false };
  }
  return { state: { hasEmitted: true }, didCross: true };
};

export const roundForSettledOffset = (
  offset: number,
  pageWidth: number,
): AllocationRound => {
  if (pageWidth <= 0) {
    return 0;
  }
  return Math.round(offset / pageWidth) >= 1 ? 1 : 0;
};

export const didDragSettleWithoutMomentum = (velocityX?: number) => !velocityX;

export const canNavigateRounds = (
  isRoundOneFrozen: boolean,
  isTouching: boolean,
) => isRoundOneFrozen && !isTouching;
