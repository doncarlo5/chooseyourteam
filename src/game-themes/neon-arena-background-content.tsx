import { BlurMask, Canvas, Fill, Path } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

const GRID_CELL_SIZE = 60;

function buildGridPath(width: number, height: number) {
  const commands: string[] = [];
  const columns = Math.max(1, Math.ceil(width / GRID_CELL_SIZE));
  const rows = Math.max(1, Math.ceil(height / GRID_CELL_SIZE));
  const cellWidth = width / columns;
  const cellHeight = height / rows;

  for (let column = 0; column <= columns; column += 1) {
    const x = column * cellWidth;
    commands.push(`M ${x} 0 L ${x} ${height}`);
  }
  for (let row = 0; row <= rows; row += 1) {
    const y = row * cellHeight;
    commands.push(`M 0 ${y} L ${width} ${y}`);
  }

  return commands.join(" ");
}

export default function NeonArenaBackgroundContent() {
  const { width, height } = useWindowDimensions();
  const gridPath = useMemo(() => buildGridPath(width, height), [height, width]);

  return (
    <View
      testID="neon-arena-background-ready"
      pointerEvents="none"
      style={styles.background}
    >
      <Canvas
        testID="neon-arena-background-canvas"
        style={StyleSheet.absoluteFill}
      >
        <Fill color="#000000" />
        <Path
          path={gridPath}
          style="stroke"
          strokeWidth={4}
          color="rgba(255,44,203,0.18)"
        >
          <BlurMask blur={8} style="solid" respectCTM={false} />
        </Path>
        <Path
          path={gridPath}
          style="stroke"
          strokeWidth={1}
          color="rgba(255,44,203,0.34)"
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
  },
});
