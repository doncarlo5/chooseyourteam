import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelTouchAllocationFeedback,
  scheduleTouchAllocationFeedback,
  systemTouchAllocationTimer,
  type TouchAllocationTimerAdapter,
} from "./touch-allocation-feedback-scheduler";

describe("touch allocation feedback scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("records feedback deterministically through the production timer adapter", () => {
    const recorded: { value: string; progress: number }[] = [];
    const fakeClockAdapter: TouchAllocationTimerAdapter = {
      schedule: vi.fn(systemTouchAllocationTimer.schedule),
      cancel: vi.fn(systemTouchAllocationTimer.cancel),
    };
    scheduleTouchAllocationFeedback({
      steps: [
        { atMs: 0, value: "arm" },
        { atMs: 500, value: "tick" },
        { atMs: 1001, value: "ignored" },
      ],
      startAfterMs: 200,
      windowMs: 1000,
      timer: fakeClockAdapter,
      feedback: (value, progress) => recorded.push({ value, progress }),
    });

    vi.advanceTimersByTime(699);
    expect(recorded).toEqual([{ value: "arm", progress: 0 }]);
    vi.advanceTimersByTime(1);
    expect(recorded).toEqual([
      { value: "arm", progress: 0 },
      { value: "tick", progress: 0.5 },
    ]);
    expect(fakeClockAdapter.schedule).toHaveBeenCalledTimes(2);
  });

  it("cancels every pending feedback task", () => {
    const feedback = vi.fn();
    const handles = scheduleTouchAllocationFeedback({
      steps: [{ atMs: 100, value: "tick" }],
      startAfterMs: 0,
      windowMs: 1000,
      timer: systemTouchAllocationTimer,
      feedback,
    });

    cancelTouchAllocationFeedback(handles, systemTouchAllocationTimer);
    vi.runAllTimers();
    expect(feedback).not.toHaveBeenCalled();
  });
});
