import { cn } from "heroui-native";
import { View } from "react-native";

export default function MeshGradientBackground() {
  return (
    <View
      className={cn("absolute inset-0 pointer-events-none bg-[#E8FBFB]")}
      style={{
        backgroundImage:
          "radial-gradient(circle at 18% 24%, rgba(0, 226, 238, 0.78), transparent 42%), radial-gradient(circle at 78% 35%, rgba(105, 239, 108, 0.72), transparent 44%), radial-gradient(circle at 52% 86%, rgba(255, 179, 71, 0.62), transparent 48%)",
      }}
    />
  );
}
