import MeshGradientBackground from "../screens/components/mesh-gradient-background";

const CORAL_SKY_PALETTE = [
  "#FF6A21",
  "#75DBFF",
  "#75DBFF",
  "#FF6A21",
  "#75DBFF",
];

export default function CoralSkyBackground() {
  return (
    <MeshGradientBackground
      baseColor="#75DBFF"
      colorDarken={1}
      overlay="rgba(132,211,242,0.02)"
      palette={CORAL_SKY_PALETTE}
      testID="coral-sky-background"
      vertexAlpha={1}
    />
  );
}
