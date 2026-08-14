import { AnimatedBlurView } from "@/src/components/animated-blur-view";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Button, cn } from "heroui-native";
import { Platform, Share, StyleSheet, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

async function shareApp(appStoreUrl: string) {
  try {
    await Share.share({ url: appStoreUrl });
  } catch (error) {
    console.error("[Share] Error sharing app:", error);
  }
}

export default function AppShareButton() {
  const blurIntensity = useSharedValue(40);
  const appStoreUrl = Constants.expoConfig?.ios?.appStoreUrl;

  if (Platform.OS !== "ios") return null;
  if (!appStoreUrl) return null;

  return (
    <Button
      size="md"
      className={cn(
        "absolute right-6 bottom-10 z-10 border border-white/60 rounded-full size-12 items-center justify-center px-0 overflow-hidden bg-gray-100/40 active:bg-gray-100/80 active:text-white",
      )}
      animation={{
        scale: {
          value: 0.96,
          timingConfig: { duration: 170 },
        },
        highlight: {
          backgroundColor: { value: "transparent" },
          opacity: { value: [0, 0] },
        },
      }}
      accessibilityRole="button"
      accessibilityLabel="Share Choose Your Team"
      accessibilityHint="Opens the share sheet with the App Store link"
      onPress={() => {
        void shareApp(appStoreUrl);
      }}
      isIconOnly
    >
      <AnimatedBlurView
        blurIntensity={blurIntensity}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className={cn("bg-white/15")}
      />
      <Button.Label>
        <Ionicons name="share-outline" size={20} color="rgba(0,0,0,0.8)" />
      </Button.Label>
    </Button>
  );
}
