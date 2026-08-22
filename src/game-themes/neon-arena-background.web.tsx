import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
import { StyleSheet, View } from "react-native";

export default function NeonArenaBackground() {
  return (
    <WithSkiaWeb
      getComponent={() => import("./neon-arena-background-content")}
      opts={{ locateFile: () => "/canvaskit.wasm" }}
      fallback={<View style={styles.fallback} />}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
  },
});
