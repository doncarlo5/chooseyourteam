import BottomActionButton from "./bottom-action-button";
import { useLingui } from "@lingui/react/macro";
import Constants from "expo-constants";
import { useRef } from "react";
import { findNodeHandle, Platform, Share, View } from "react-native";

async function shareApp(appStoreUrl: string, anchor?: number) {
  try {
    await Share.share({ url: appStoreUrl }, { anchor });
  } catch (error) {
    console.error("[Share] Error sharing app:", error);
  }
}

export default function AppShareButton() {
  const { t } = useLingui();
  const buttonRef = useRef<View>(null);
  const appStoreUrl = Constants.expoConfig?.ios?.appStoreUrl;
  const isPad = Platform.OS === "ios" && Platform.isPad;
  const brandName = "Choose Your Team";

  if (Platform.OS !== "ios") return null;
  if (!appStoreUrl) return null;

  return (
    <BottomActionButton
      buttonRef={buttonRef}
      side="right"
      iconName="share-outline"
      accessibilityLabel={t`Share ${brandName}`}
      accessibilityHint={t`Opens the share sheet with the App Store link`}
      onPress={() => {
        const anchor = isPad
          ? (findNodeHandle(buttonRef.current) ?? undefined)
          : undefined;

        void shareApp(appStoreUrl, anchor);
      }}
    />
  );
}
