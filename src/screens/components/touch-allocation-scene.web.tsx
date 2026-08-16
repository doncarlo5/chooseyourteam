import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { View } from "react-native";
import type { TouchAllocationSceneProps } from "./touch-allocation-scene-content";

export type {
  TouchAllocationConfiguration,
  TouchAllocationSceneProps,
} from "./touch-allocation-scene-content";

export default function TouchAllocationScene(props: TouchAllocationSceneProps) {
  return (
    <WithSkiaWeb
      getComponent={() => import("./touch-allocation-scene-content")}
      componentProps={props}
      opts={{ locateFile: () => "/canvaskit.wasm" }}
      fallback={<View className="flex-1" />}
    />
  );
}
