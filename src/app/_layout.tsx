import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { cn, HeroUINativeProvider } from "heroui-native";
import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  KeyboardAvoidingView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import {
  configureReanimatedLogger,
  ReanimatedLogLevel,
} from "react-native-reanimated";
import "../../global.css";
import { AppThemeProvider } from "../contexts/app-theme-context";
import {
  GameThemeProvider,
  useGameTheme,
} from "../game-themes/game-theme-provider";
import {
  LocalizationProvider,
  useLocalization,
} from "../localization/localization-provider";

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

void SplashScreen.preventAutoHideAsync();

/**
 * Component that wraps app content inside KeyboardProvider
 * Contains the contentWrapper and HeroUINativeProvider configuration
 */
function AppContent(props: { fontsReady: boolean }) {
  const { isReady: localizationReady } = useLocalization();
  const { isReady: gameThemeReady } = useGameTheme();
  const contentWrapper = useCallback(
    (children: React.ReactNode) => (
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior="padding"
        keyboardVerticalOffset={12}
        className="flex-1"
      >
        {children}
      </KeyboardAvoidingView>
    ),
    [],
  );
  const hideSplashScreenWhenReady = useCallback(() => {
    if (props.fontsReady && localizationReady && gameThemeReady) {
      void SplashScreen.hideAsync();
    }
  }, [gameThemeReady, localizationReady, props.fontsReady]);

  useEffect(hideSplashScreenWhenReady, [hideSplashScreenWhenReady]);

  if (!props.fontsReady || !localizationReady || !gameThemeReady) {
    return null;
  }

  return (
    <AppThemeProvider>
      <HeroUINativeProvider
        config={{
          toast: {
            contentWrapper,
          },
        }}
      >
        <View className={cn("flex-1 bg-transparent")}>
          <Slot />
        </View>
      </HeroUINativeProvider>
    </AppThemeProvider>
  );
}

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
    QuickSand: require("../../assets/fonts/Quicksand.ttf"),
    ...AntDesign.font,
    ...FontAwesome6.font,
    ...Ionicons.font,
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <GestureHandlerRootView className={cn("flex-1")}>
      <KeyboardProvider>
        <LocalizationProvider>
          <GameThemeProvider>
            <AppContent fontsReady={fontsReady} />
          </GameThemeProvider>
        </LocalizationProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
