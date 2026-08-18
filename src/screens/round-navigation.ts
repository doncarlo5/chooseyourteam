import type { AllocationRound } from "./state/allocation-session-state";

export type RoundThresholdState = {
  hasEmitted: boolean;
};

export type SettledRoundNavigation = {
  round: AllocationRound;
  isIdle: true;
};

export const shouldEmitRoundSwipeThreshold = (
  hasEmitted: boolean,
  offset: number,
  pageWidth: number,
) => {
  "worklet";
  return !hasEmitted && pageWidth > 0 && offset >= pageWidth * 0.5;
};

export const observeRoundSwipeThreshold = (
  state: RoundThresholdState,
  offset: number,
  pageWidth: number,
) => {
  if (!shouldEmitRoundSwipeThreshold(state.hasEmitted, offset, pageWidth)) {
    return { state, didCross: false };
  }
  return { state: { hasEmitted: true }, didCross: true };
};

export const roundForSettledOffset = (
  offset: number,
  pageWidth: number,
): AllocationRound => {
  "worklet";
  if (pageWidth <= 0) {
    return 0;
  }
  return Math.round(offset / pageWidth) >= 1 ? 1 : 0;
};

export const settleRoundNavigation = (
  offset: number,
  pageWidth: number,
): SettledRoundNavigation => {
  "worklet";
  return {
    round: roundForSettledOffset(offset, pageWidth),
    isIdle: true,
  };
};

export const createRoundNavigationReset = () => ({
  offset: 0,
  isIdle: true as const,
  threshold: { hasEmitted: false },
});

export const didDragSettleWithoutMomentum = (velocityX?: number) => {
  "worklet";
  return !velocityX;
};

export const canNavigateRounds = (
  isRoundOneFrozen: boolean,
  isTouching: boolean,
) => isRoundOneFrozen && !isTouching;
