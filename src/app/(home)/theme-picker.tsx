import { View } from "react-native";
import { useThemeColor } from "heroui-native";
import { AppText } from "../../components/app-text";
import { ThemeSelectorBar } from "../../components/theme-selector";

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
