import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { cn } from "heroui-native";

export default function TouchAllocationVisualRoute() {
  if (process.env.EXPO_PUBLIC_VISUAL_TEST_MODE !== "1") {
    return <Redirect href="/" />;
  }

  return (
    <WithSkiaWeb
      getComponent={() =>
        import("@/src/screens/components/touch-allocation-visual-fixture")
      }
      opts={{ locateFile: () => "/canvaskit.wasm" }}
      fallback={<View className={cn("flex-1 bg-emerald-200")} />}
    />
  );
}
