import { AppText } from "@/src/components/app-text";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { Trans, useLingui } from "@lingui/react/macro";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as StoreReview from "expo-store-review";
import { Button, cn } from "heroui-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";

const RATE_OPEN_COUNT_KEY = "rate_open_count_v1";
const RATE_HAS_OPENED_RATING_PAGE_KEY = "rate_has_opened_rating_page_v1";

const getStoreReviewUrl = () => {
  try {
    const baseUrl = StoreReview.storeUrl();
    if (!baseUrl) {
      return null;
    }

    const join = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${join}action=write-review`;
  } catch {
    return null;
  }
};

export default function AppReviewButton(props: { isVisible: boolean }) {
  const { t } = useLingui();
  const { theme } = useGameTheme();
  const canUseStoreReview =
    Platform.OS === "ios" &&
    !__DEV__ &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
  const [storeReviewUrl] = useState(() =>
    canUseStoreReview ? getStoreReviewUrl() : null,
  );
  const [openCount, setOpenCount] = useState(0);
  const [hasOpenedRatingPage, setHasOpenedRatingPage] = useState(false);
  const isReviewStateMounted = useRef(false);

  const loadReviewState = useCallback(async () => {
    try {
      const [countRaw, openedRatingPageRaw] = await Promise.all([
        AsyncStorage.getItem(RATE_OPEN_COUNT_KEY),
        AsyncStorage.getItem(RATE_HAS_OPENED_RATING_PAGE_KEY),
      ]);

      const nextCount = (parseInt(countRaw ?? "0", 10) || 0) + 1;
      const openedRatingPage = openedRatingPageRaw === "1";

      await AsyncStorage.setItem(RATE_OPEN_COUNT_KEY, String(nextCount));

      if (!isReviewStateMounted.current) return;
      setOpenCount(nextCount);
      setHasOpenedRatingPage(openedRatingPage);
    } catch (error) {
      console.error("[AsyncStorage] Error:", error);
    }
  }, []);
  const cleanupReviewState = useCallback(() => {
    isReviewStateMounted.current = false;
  }, []);
  const initializeReviewState = useCallback(() => {
    if (!canUseStoreReview) {
      return;
    }

    isReviewStateMounted.current = true;
    void loadReviewState();
    return cleanupReviewState;
  }, [canUseStoreReview, cleanupReviewState, loadReviewState]);

  useEffect(initializeReviewState, [initializeReviewState]);

  if (!props.isVisible) return null;
  if (!canUseStoreReview) return null;
  if (!storeReviewUrl) return null;
  if (openCount < 5 || hasOpenedRatingPage) return null;

  return (
    <View className="absolute bottom-10 inset-x-0 items-center">
      <Button
        size="md"
        className={cn("rounded-full px-5", theme.chrome.reviewSurfaceClassName)}
        accessibilityRole="button"
        accessibilityLabel={t`Rate this app`}
        accessibilityHint={t`Opens the App Store review page`}
        onPress={async () => {
          try {
            await Linking.openURL(storeReviewUrl);
            await AsyncStorage.setItem(RATE_HAS_OPENED_RATING_PAGE_KEY, "1");
            setHasOpenedRatingPage(true);
          } catch (error) {
            console.error("[AsyncStorage] Error opening rating page:", error);
          }
        }}
      >
        <View className={cn("flex-row items-center gap-2")}>
          <AppText
            className={cn(
              "text-sm font-semibold",
              theme.chrome.reviewForegroundClassName,
            )}
          >
            <Trans>Give a review</Trans>
          </AppText>
          <FontAwesome6
            name="smile"
            size={16}
            color={theme.chrome.reviewIconColor}
            opacity={0.8}
          />
        </View>
      </Button>
    </View>
  );
}
