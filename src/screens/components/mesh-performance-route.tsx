import { AppText } from "@/src/components/app-text";
import { Redirect, useLocalSearchParams } from "expo-router";
import { cn } from "heroui-native";
import { View } from "react-native";
import MeshGradientBackground from "./mesh-gradient-background";

type MeshPerformanceScenario = "current" | "no-blur" | "paused";

const isScenario = (value?: string): value is MeshPerformanceScenario =>
  value === "current" || value === "no-blur" || value === "paused";

export default function MeshPerformanceRoute() {
  const params = useLocalSearchParams<{ scenario?: string }>();
  const isFixtureEnabled =
    process.env.EXPO_PUBLIC_ENABLE_NATIVE_PERF_FIXTURES === "true";
  const scenario = isScenario(params.scenario) ? params.scenario : "current";

  if (!isFixtureEnabled) {
    return <Redirect href="/" />;
  }

  return (
    <View className={cn("flex-1 bg-white")}>
      <MeshGradientBackground
        testID={`mesh-performance-${scenario}`}
        blurSigma={scenario === "no-blur" ? 0 : 14}
        meshOverscan={28}
        isAnimationPaused={scenario === "paused"}
      />
      <AppText
        accessibilityRole="header"
        className={cn(
          "absolute top-16 self-center rounded-full bg-white/80 px-4 py-2 text-black",
        )}
      >
        Mesh benchmark: {scenario}
      </AppText>
    </View>
  );
}
