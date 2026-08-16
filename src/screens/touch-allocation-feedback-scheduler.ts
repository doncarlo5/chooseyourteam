export type TouchAllocationTimerAdapter = {
  schedule: (
    task: () => void,
    delayMs: number,
  ) => ReturnType<typeof setTimeout>;
  cancel: (handle: ReturnType<typeof setTimeout>) => void;
};

export const systemTouchAllocationTimer: TouchAllocationTimerAdapter = {
  schedule: (task, delayMs) => setTimeout(task, delayMs),
  cancel: (handle) => clearTimeout(handle),
};

export const scheduleTouchAllocationFeedback = <T>(props: {
  steps: { atMs: number; value: T }[];
  startAfterMs: number;
  windowMs: number;
  timer: TouchAllocationTimerAdapter;
  feedback: (value: T, progress: number) => void;
}) =>
  props.steps.flatMap((step) => {
    if (step.atMs < 0 || step.atMs > props.windowMs) {
      return [];
    }
    return [
      props.timer.schedule(() => {
        props.feedback(step.value, step.atMs / props.windowMs);
      }, props.startAfterMs + step.atMs),
    ];
  });

export const cancelTouchAllocationFeedback = (
  handles: ReturnType<typeof setTimeout>[],
  timer: TouchAllocationTimerAdapter,
) => {
  handles.forEach((handle) => timer.cancel(handle));
};
