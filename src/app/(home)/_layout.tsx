import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useThemeColor, useToast } from "heroui-native";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useAppTheme } from "../../contexts/app-theme-context";

export default function Layout() {
  const { t } = useLingui();
  const { isDark } = useAppTheme();
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  const reducedMotion = useReducedMotion();
  const { toast } = useToast();
  const hasShownReducedMotionToast = useRef(false);
  const reducedMotionLabel = t`Reduce motion enabled`;
  const reducedMotionDescription = t`All animations will be disabled`;
  const closeLabel = t({
    context: "dismiss reduced-motion notification",
    message: "Close",
  });
  const showReducedMotionToast = useCallback(() => {
    if (!reducedMotion) {
      hasShownReducedMotionToast.current = false;
      return;
    }
    if (hasShownReducedMotionToast.current) {
      return;
    }

    hasShownReducedMotionToast.current = true;
    toast.show({
      duration: "persistent",
      variant: "warning",
      label: reducedMotionLabel,
      description: reducedMotionDescription,
      actionLabel: closeLabel,
      onActionPress: (props) => props.hide(),
    });
  }, [
    closeLabel,
    reducedMotion,
    reducedMotionDescription,
    reducedMotionLabel,
    toast,
  ]);

  useEffect(showReducedMotionToast, [showReducedMotionToast]);

  return (
    <View className="flex-1" style={{ backgroundColor: "transparent" }}>
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerTransparent: true,
          headerBlurEffect: isDark ? "dark" : "light",
          headerTintColor: themeColorForeground,
          headerStyle: {
            backgroundColor: Platform.select({
              ios: undefined,
              android: themeColorBackground,
            }),
          },
          headerTitleStyle: {
            fontFamily: "Inter_600SemiBold",
          },
          headerBackButtonDisplayMode: "generic",
          gestureEnabled: true,
          gestureDirection: "horizontal",
          fullScreenGestureEnabled: isLiquidGlassAvailable() ? false : true,
          contentStyle: {
            backgroundColor: "transparent",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="components/index"
          options={{ headerTitle: "Components" }}
        />
        <Stack.Screen
          name="components/accordion"
          options={{ title: "Accordion" }}
        />
        <Stack.Screen name="components/avatar" options={{ title: "Avatar" }} />
        <Stack.Screen name="components/button" options={{ title: "Button" }} />
        <Stack.Screen name="components/card" options={{ title: "Card" }} />
        <Stack.Screen
          name="components/checkbox"
          options={{ title: "Checkbox" }}
        />
        <Stack.Screen name="components/chip" options={{ title: "Chip" }} />
        <Stack.Screen name="components/dialog" options={{ title: "Dialog" }} />
        <Stack.Screen
          name="components/dialog-native-modal"
          options={{ title: "Dialog Native Modal", presentation: "formSheet" }}
        />
        <Stack.Screen
          name="components/divider"
          options={{ title: "Separator" }}
        />
        <Stack.Screen
          name="components/error-view"
          options={{ title: "Error View" }}
        />
        <Stack.Screen
          name="components/form-field"
          options={{ title: "Form Field" }}
        />
        <Stack.Screen
          name="components/popover"
          options={{ title: "Popover" }}
        />
        <Stack.Screen
          name="components/pressable-feedback"
          options={{ title: "Pressable Feedback" }}
        />
        <Stack.Screen
          name="components/popover-native-modal"
          options={{ title: "Popover Native Modal", presentation: "formSheet" }}
        />
        <Stack.Screen
          name="components/radio-group"
          options={{ title: "Radio Group" }}
        />
        <Stack.Screen
          name="components/scroll-shadow"
          options={{ title: "Scroll Shadow" }}
        />
        <Stack.Screen
          name="components/select-native-modal"
          options={{ title: "Select Native Modal", presentation: "formSheet" }}
        />
        <Stack.Screen name="components/select" options={{ title: "Select" }} />
        <Stack.Screen
          name="components/skeleton"
          options={{ title: "Skeleton" }}
        />
        <Stack.Screen
          name="components/spinner"
          options={{ title: "Spinner" }}
        />
        <Stack.Screen
          name="components/surface"
          options={{ title: "Surface" }}
        />
        <Stack.Screen name="components/switch" options={{ title: "Switch" }} />
        <Stack.Screen name="components/tabs" options={{ title: "Tabs" }} />
        <Stack.Screen
          name="components/text-field"
          options={{ title: "TextField" }}
        />
        <Stack.Screen name="components/toast" options={{ title: "Toast" }} />
        <Stack.Screen
          name="components/theme-picker"
          options={{ headerTitle: "Themes" }}
        />
        <Stack.Screen name="themes/index" options={{ headerTitle: "Themes" }} />
        <Stack.Screen
          name="showcases"
          options={{
            headerShown: false,
            animation: "slide_from_bottom",
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="components/toast-native-modal"
          options={{
            title: "Toast From Native Modal",
            presentation: "formSheet",
          }}
        />
      </Stack>
    </View>
  );
}
