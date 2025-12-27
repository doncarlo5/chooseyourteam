import { AppText } from "@/src/components/app-text";
import { ThemeSelectorBar } from "@/src/components/theme-selector";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";

export default function ThemePicker() {
  const themeColorBackground = useThemeColor("background");

  return (
    <View
      className="flex-1 justify-center"
      style={{ backgroundColor: themeColorBackground }}
    >
      <AppText className="text-lg font-semibold text-foreground text-center mb-6">
        Choose theme
      </AppText>
      <ThemeSelectorBar />
    </View>
  );
}
