import { cn } from "heroui-native";
import { View } from "react-native";
import type { MeshGradientBackgroundProps } from "./mesh-gradient-background.types";

const DEFAULT_BACKGROUND_IMAGE =
  "radial-gradient(circle at 18% 24%, rgba(0, 226, 238, 0.78), transparent 42%), radial-gradient(circle at 78% 35%, rgba(105, 239, 108, 0.72), transparent 44%), radial-gradient(circle at 52% 86%, rgba(255, 179, 71, 0.62), transparent 48%)";

const withAlpha = (color: string, alpha: string) =>
  /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;

const getBackgroundImage = (
  palette: readonly string[],
  overlay: string | undefined,
) => {
  const firstAccent = palette[0] ?? "#00E2EE";
  const calmColor = palette[1] ?? firstAccent;
  const secondAccent = palette[3] ?? palette[2] ?? firstAccent;

  const gradients = [
    `radial-gradient(circle at 8% 82%, ${withAlpha(firstAccent, "D1")}, transparent 44%)`,
    `radial-gradient(circle at 92% 84%, ${withAlpha(secondAccent, "C2")}, transparent 46%)`,
    `radial-gradient(circle at 52% 24%, ${withAlpha(calmColor, "B8")}, transparent 52%)`,
  ];
  if (overlay) {
    gradients.unshift(`linear-gradient(${overlay}, ${overlay})`);
  }
  return gradients.join(", ");
};

export default function MeshGradientBackground(
  props: MeshGradientBackgroundProps,
) {
  const isDefaultAppearance =
    props.baseColor === undefined &&
    props.overlay === undefined &&
    props.palette === undefined;

  return (
    <View
      testID={props.testID}
      className={cn("absolute inset-0 pointer-events-none bg-[#E8FBFB]")}
      style={{
        backgroundColor: props.baseColor ?? "#E8FBFB",
        backgroundImage: isDefaultAppearance
          ? DEFAULT_BACKGROUND_IMAGE
          : getBackgroundImage(props.palette ?? [], props.overlay),
      }}
    />
  );
}
