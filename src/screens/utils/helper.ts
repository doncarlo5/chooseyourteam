import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const isAndroid = Platform.OS === "android";

let pairingFeedbackToken = 0;

async function playPairingFeedback(isEnabled: boolean) {
  const token = ++pairingFeedbackToken;
  if (Platform.OS === "web") return;
  const impacts = isEnabled
    ? [
        Haptics.ImpactFeedbackStyle.Rigid,
        Haptics.ImpactFeedbackStyle.Heavy,
        Haptics.ImpactFeedbackStyle.Heavy,
      ]
    : [Haptics.ImpactFeedbackStyle.Heavy, Haptics.ImpactFeedbackStyle.Rigid];

  for (let index = 0; index < impacts.length; index += 1) {
    // A new toggle cancels the remaining pulses of the previous pattern.
    if (token !== pairingFeedbackToken) return;
    await (isAndroid
      ? Haptics.performAndroidHapticsAsync(
          index === impacts.length - 1
            ? isEnabled
              ? Haptics.AndroidHaptics.Confirm
              : Haptics.AndroidHaptics.Reject
            : Haptics.AndroidHaptics.Context_Click,
        )
      : Haptics.impactAsync(impacts[index]));
    if (index < impacts.length - 1) {
      await new Promise<void>((resolve) =>
        setTimeout(resolve, isEnabled ? 70 : 90),
      );
    }
  }
}

export const H = {
  startPress: () =>
    isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),

  selectionChange: () =>
    isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync(),

  // A forceful triple pulse on activation, a sharp double pulse on deactivation.
  pairingModeOn: () => playPairingFeedback(true),
  pairingModeOff: () => playPairingFeedback(false),

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
};

export type Step = { t: number; fn: () => void };

const MIN_GAP_MS = 70;

export const styleChargeBomb = (totalMs: number): Step[] => {
  const steps: Step[] = [];

  // Act 1: arming stutter
  steps.push({ t: 0, fn: H.arm });
  steps.push({ t: 70, fn: H.tickSoft });
  steps.push({ t: 150, fn: H.tickSoft });
  steps.push({ t: 240, fn: H.tickSoft });

  // Act 2: crescendo — more pulses, packed near end
  const rampStart = 320;
  const rampEnd = Math.max(rampStart, totalMs - 420);
  const pulses = 18;

  for (let i = 0; i < pulses; i += 1) {
    const p = i / (pulses - 1);

    // cubic ease-out => more beats near the end
    const eased = 1 - Math.pow(1 - p, 3);

    const t = Math.floor(rampStart + (rampEnd - rampStart) * eased);

    const fn =
      p < 0.25
        ? H.tickSoft
        : p < 0.55
          ? H.tick
          : p < 0.8
            ? H.tickStrong
            : H.snap;

    steps.push({ t, fn });
  }

  // Act 3: final rattle (tight but safe)
  const rattleStart = totalMs - 350;
  for (let t = rattleStart; t <= totalMs - 70; t += 70) {
    steps.push({ t, fn: t < totalMs - 140 ? H.tickStrong : H.snap });
  }

  // Sort and enforce min gap globally
  const sorted = steps
    .filter((s) => s.t >= 0 && s.t <= totalMs)
    .sort((a, b) => a.t - b.t);

  const pruned: Step[] = [];
  let lastT = -Infinity;
  for (const s of sorted) {
    if (s.t - lastT < MIN_GAP_MS) continue;
    pruned.push(s);
    lastT = s.t;
  }

  return pruned;
};
