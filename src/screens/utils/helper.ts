import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const isAndroid = Platform.OS === "android";

export const H = {
  // Strong “I registered your first touch”
  touchDown: () =>
    isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Countdown starts (expected touches met) — feels like “arming”
  arm: () =>
    isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Gesture_Start)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Weak ticks (avoid Segment_Frequent_Tick: it can be too soft / silent)
  tickSoft: () =>
    isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),

  // Medium ticks
  tick: () =>
    isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  // Stronger ticks approaching reveal
  tickStrong: () =>
    isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),

  // Sharp snap
  snap: () =>
    isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),

  // REVEAL “bomb”
  boom: () => {
    if (isAndroid) {
      // big buzz + semantic confirm
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      void Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
    } else {
      // heavy + success feels like a punch + sparkle
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
};

export type Step = { t: number; fn: () => void };

// Keeps pulses from being too close together (many phones will “merge” them)
const MIN_GAP_MS = 70;

export const styleChargeBomb = (totalMs: number): Step[] => {
  const steps: Step[] = [];

  // Act 1: arming stutter (very early)
  steps.push({ t: 0, fn: H.arm });
  steps.push({ t: 60, fn: H.tickSoft });
  steps.push({ t: 130, fn: H.tickSoft });
  steps.push({ t: 220, fn: H.tickSoft });

  // Act 2: crescendo — ticks get closer + stronger
  const rampStart = 380;
  const rampEnd = Math.max(rampStart, totalMs - 340);
  const pulses = 14;

  let lastT = -Infinity;

  for (let i = 0; i < pulses; i++) {
    const p = i / (pulses - 1); // 0..1

    // Ease-out => more pulses near the end (crescendo)
    const eased = 1 - (1 - p) * (1 - p); // quadratic ease-out

    const t = Math.floor(rampStart + (rampEnd - rampStart) * eased);
    if (t - lastT < MIN_GAP_MS) continue;
    lastT = t;

    const fn =
      p < 0.35
        ? H.tickSoft
        : p < 0.65
          ? H.tick
          : p < 0.85
            ? H.tickStrong
            : H.snap;

    steps.push({ t, fn });
  }

  // Act 3: final drum-roll right before reveal
  steps.push({ t: totalMs - 260, fn: H.tickStrong });
  steps.push({ t: totalMs - 170, fn: H.snap });
  steps.push({ t: totalMs - 90, fn: H.snap });

  // IMPORTANT: NO “success/confirm” here — do it in handleReveal() so it always matches the actual reveal moment.
  return steps
    .filter((s) => s.t >= 0 && s.t <= totalMs)
    .sort((a, b) => a.t - b.t);
};
