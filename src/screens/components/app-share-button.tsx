import BottomActionButton from "./bottom-action-button";
import { useLingui } from "@lingui/react/macro";
import Constants from "expo-constants";
import { useRef } from "react";
import { findNodeHandle, Platform, Share, View } from "react-native";

const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.doncarlos.chooseyourteam";

async function shareApp(storeUrl: string, anchor?: number) {
  try {
    const content =
      Platform.OS === "android"
        ? { message: storeUrl }
        : { url: storeUrl };
    await Share.share(content, { anchor });
  } catch (error) {
    console.error("[Share] Error sharing app:", error);
  }
}

export default function AppShareButton() {
  const { t } = useLingui();
  const buttonRef = useRef<View>(null);
  const appStoreUrl = Constants.expoConfig?.ios?.appStoreUrl;
  const storeUrl = Platform.OS === "android" ? GOOGLE_PLAY_URL : appStoreUrl;
  const isPad = Platform.OS === "ios" && Platform.isPad;
  const brandName = "Choose Your Team";

  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  if (!storeUrl) return null;

  return (
    <BottomActionButton
      buttonRef={buttonRef}
      side="right"
      iconName="share-outline"
      accessibilityLabel={t`Share ${brandName}`}
      accessibilityHint={
        Platform.OS === "android"
          ? t`Opens the share sheet with the Google Play link`
          : t`Opens the share sheet with the App Store link`
      }
      onPress={() => {
        const anchor = isPad
          ? (findNodeHandle(buttonRef.current) ?? undefined)
          : undefined;

        void shareApp(storeUrl, anchor);
      }}
    />
  );
}
