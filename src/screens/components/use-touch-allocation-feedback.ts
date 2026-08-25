import { MAX_OBSERVED_PLAYER_COUNT } from "@/src/domain/team-allocation";
import { H, type Step, styleChargeBomb } from "@/src/screens/utils/helper";
import {
  cancelTouchAllocationFeedback,
  scheduleTouchAllocationFeedback,
  systemTouchAllocationTimer,
} from "@/src/screens/touch-allocation-feedback-scheduler";
import { useLingui } from "@lingui/react/macro";
import { Asset } from "expo-asset";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useToast } from "heroui-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const SHAKE_AMP_MIN = 1.5;
const SHAKE_AMP_MAX = 16;
const SHAKE_OSC_MIN = 2;
const SHAKE_OSC_MAX = 9;
const SHAKE_OSC_MS_SLOW = 34;
const SHAKE_OSC_MS_FAST = 12;
const SHAKE_SETTLE_MS_SLOW = 120;
const SHAKE_SETTLE_MS_FAST = 50;

const bubbleModules = [
  require("../../../assets/audio/bubble-1.wav"),
  require("../../../assets/audio/bubble-2.wav"),
  require("../../../assets/audio/bubble-3.wav"),
  require("../../../assets/audio/bubble-4.wav"),
  require("../../../assets/audio/bubble-5.wav"),
] as const;

const setupAudioMode = async () => {
  try {
    await setAudioModeAsync({
      playsInSilentMode: false,
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      ...(Platform.OS === "ios" ? { interruptionMode: "mixWithOthers" } : {}),
    });
  } catch (error) {
    console.warn("setAudioModeAsync failed", error);
  }
};

const useBubblePlayers = () => {
  const [uris, setUris] = useState<(string | null)[]>(
    Array.from({ length: bubbleModules.length }, () => null),
  );
  const pendingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Asset.loadAsync([...bubbleModules])
      .then((assets) => {
        if (!cancelled) {
          setUris(assets.map((asset) => asset.localUri ?? asset.uri));
        }
      })
      .catch((error) => console.warn("Failed to load bubble assets", error));
    return () => {
      cancelled = true;
    };
  }, []);

  const player0 = useAudioPlayer(uris[0], {
    keepAudioSessionActive: true,
    downloadFirst: true,
  });
  const player1 = useAudioPlayer(uris[1], {
    keepAudioSessionActive: true,
    downloadFirst: true,
  });
  const player2 = useAudioPlayer(uris[2], {
    keepAudioSessionActive: true,
    downloadFirst: true,
  });
  const player3 = useAudioPlayer(uris[3], {
    keepAudioSessionActive: true,
    downloadFirst: true,
  });
  const player4 = useAudioPlayer(uris[4], {
    keepAudioSessionActive: true,
    downloadFirst: true,
  });
  const players = useMemo(
    () => [player0, player1, player2, player3, player4],
    [player0, player1, player2, player3, player4],
  );
  const status0 = useAudioPlayerStatus(player0);
  const status1 = useAudioPlayerStatus(player1);
  const status2 = useAudioPlayerStatus(player2);
  const status3 = useAudioPlayerStatus(player3);
  const status4 = useAudioPlayerStatus(player4);
  const statuses = useMemo(
    () => [status0, status1, status2, status3, status4] as const,
    [status0, status1, status2, status3, status4],
  );

  useEffect(() => {
    statuses.forEach((status, index) => {
      if (!status.isLoaded || !pendingRef.current.has(index)) {
        return;
      }
      pendingRef.current.delete(index);
      const player = players[index];
      player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => {
          try {
            player.play();
          } catch {
            return;
          }
        });
    });
  }, [players, statuses]);

  return { players, statuses, pendingRef };
};

export default function useTouchAllocationFeedback(props: {
  shakeX: SharedValue<number>;
}) {
  const { t } = useLingui();
  const { toast } = useToast();
  const bubbleAudio = useBubblePlayers();
  const preRevealHapticsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shakeDirectionRef = useRef(1);

  const clearPreRevealHaptics = () => {
    cancelTouchAllocationFeedback(
      preRevealHapticsRef.current,
      systemTouchAllocationTimer,
    );
    preRevealHapticsRef.current = [];
  };

  const playBubble = (soundIndex: number) => {
    if (bubbleAudio.players.length === 0) {
      return;
    }
    const index = soundIndex % bubbleAudio.players.length;
    const player = bubbleAudio.players[index];
    if (!bubbleAudio.statuses[index].isLoaded) {
      bubbleAudio.pendingRef.current.add(index);
      return;
    }
    player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => {
        try {
          player.play();
        } catch {
          return;
        }
      });
  };

  const showIosTouchLimitToast = () => {
    toast.show({
      id: "ios-touch-limit",
      variant: "warning",
      label: t`Maximum 5 fingers`,
      description: t`Go back and select 6 or more players.`,
    });
  };

  const showAndroidTouchLimitToast = () => {
    toast.show({
      id: "android-touch-limit",
      variant: "warning",
      label: t`Maximum ${MAX_OBSERVED_PLAYER_COUNT} fingers`,
      description: t`Only the first ${MAX_OBSERVED_PLAYER_COUNT} detected fingers can join.`,
    });
  };

  const schedulePreRevealHaptics = (
    totalDelayMs: number,
    startAfterMs: number,
  ) => {
    const windowMs = Math.max(1, totalDelayMs - startAfterMs);
    const steps = styleChargeBomb(windowMs);
    clearPreRevealHaptics();
    shakeDirectionRef.current = 1;
    cancelAnimation(props.shakeX);
    props.shakeX.set(0);

    const lerp = (a: number, b: number, progress: number) =>
      a + (b - a) * progress;
    const kindMultiplier = (fn: Step["fn"]) => {
      if (fn === H.arm) return 0.35;
      if (fn === H.tickSoft) return 0.5;
      if (fn === H.tick) return 0.7;
      if (fn === H.tickStrong) return 0.9;
      if (fn === H.snap) return 1;
      return 0.45;
    };
    const kickShake = (progress: number, fn: Step["fn"]) => {
      const boundedProgress = Math.max(0, Math.min(1, progress));
      const energy = Math.pow(boundedProgress, 2.6);
      const amplitude =
        lerp(SHAKE_AMP_MIN, SHAKE_AMP_MAX, energy) * kindMultiplier(fn);
      if (amplitude < 0.25) {
        return;
      }
      const oscillations = Math.round(
        lerp(SHAKE_OSC_MIN, SHAKE_OSC_MAX, energy),
      );
      const oscillationMs = Math.round(
        lerp(SHAKE_OSC_MS_SLOW, SHAKE_OSC_MS_FAST, energy),
      );
      const settleMs = Math.round(
        lerp(SHAKE_SETTLE_MS_SLOW, SHAKE_SETTLE_MS_FAST, energy),
      );
      shakeDirectionRef.current *= -1;
      let direction = shakeDirectionRef.current;
      const sequence = [];
      const denominator = Math.max(1, oscillations - 1);
      for (let index = 0; index < oscillations; index += 1) {
        const decay = 1 - (index / denominator) * 0.6;
        sequence.push(
          withTiming(direction * amplitude * decay, {
            duration: oscillationMs,
            easing: Easing.linear,
          }),
        );
        direction *= -1;
      }
      if (boundedProgress > 0.85) {
        const buzzAmplitude = amplitude * 0.22;
        sequence.push(
          withTiming(buzzAmplitude, { duration: 12, easing: Easing.linear }),
          withTiming(-buzzAmplitude, { duration: 12, easing: Easing.linear }),
          withTiming(buzzAmplitude, { duration: 12, easing: Easing.linear }),
          withTiming(0, { duration: 12, easing: Easing.linear }),
        );
      }
      sequence.push(
        withTiming(0, {
          duration: settleMs,
          easing: Easing.out(Easing.quad),
        }),
      );
      props.shakeX.set(withSequence(...sequence));
    };

    preRevealHapticsRef.current = scheduleTouchAllocationFeedback({
      steps: steps.map((step) => ({ atMs: step.t, value: step.fn })),
      startAfterMs,
      windowMs,
      timer: systemTouchAllocationTimer,
      feedback: (fn, progress) => {
        kickShake(progress, fn);
        void fn();
      },
    });
  };

  useEffect(() => {
    void setupAudioMode();
    return clearPreRevealHaptics;
  }, []);

  return {
    clearPreRevealHaptics,
    playBubble,
    schedulePreRevealHaptics,
    showAndroidTouchLimitToast,
    showIosTouchLimitToast,
  };
}
