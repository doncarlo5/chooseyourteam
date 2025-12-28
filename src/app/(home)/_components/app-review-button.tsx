import { AppText } from "@/src/components/app-text";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { Button, cn } from "heroui-native";
import { useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";

const RATE_OPEN_COUNT_KEY = "rate_open_count_v1";
const RATE_HAS_OPENED_RATING_PAGE_KEY = "rate_has_opened_rating_page_v1";

export default function AppReviewButton(props: { isDark: boolean }) {
  const [storeReviewUrl, setStoreReviewUrl] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const [hasOpenedRatingPage, setHasOpenedRatingPage] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [countRaw, openedRatingPageRaw] = await Promise.all([
          AsyncStorage.getItem(RATE_OPEN_COUNT_KEY),
          AsyncStorage.getItem(RATE_HAS_OPENED_RATING_PAGE_KEY),
        ]);

        console.log("[AsyncStorage] Read values:", {
          countRaw,
          openedRatingPageRaw,
          RATE_OPEN_COUNT_KEY,
          RATE_HAS_OPENED_RATING_PAGE_KEY,
        });

        const nextCount = (parseInt(countRaw ?? "0", 10) || 0) + 1;
        const openedRatingPage = openedRatingPageRaw === "1";

        console.log("[AsyncStorage] Parsed values:", {
          nextCount,
          openedRatingPage,
        });

        await AsyncStorage.setItem(RATE_OPEN_COUNT_KEY, String(nextCount));
        console.log("[AsyncStorage] Saved count:", nextCount);

        if (!mounted) return;
        setOpenCount(nextCount);
        setHasOpenedRatingPage(openedRatingPage);
      } catch (error) {
        console.error("[AsyncStorage] Error:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadStoreUrl = async () => {
      try {
        const baseUrl = StoreReview.storeUrl();
        if (!baseUrl) {
          setStoreReviewUrl(null);
          return;
        }

        if (!isMounted) {
          return;
        }
        const join = baseUrl.includes("?") ? "&" : "?";
        if (Platform.OS === "ios") {
          setStoreReviewUrl(`${baseUrl}${join}action=write-review`);
        } else if (Platform.OS === "android") {
          setStoreReviewUrl(`${baseUrl}${join}showAllReviews=true`);
        } else {
          setStoreReviewUrl(baseUrl);
        }
      } catch {
        if (isMounted) {
          setStoreReviewUrl(null);
        }
      }
    };
    void loadStoreUrl();
    return () => {
      isMounted = false;
    };
  }, []);

  if (Platform.OS !== "ios") return null;
  if (!storeReviewUrl) return null;
  if (openCount < 5 || hasOpenedRatingPage) return null;

  return (
    <View className="absolute bottom-10 inset-x-0 items-center">
      <Button
        size="md"
        className={cn(
          "rounded-full px-5",
          props.isDark ? "bg-[#E4E4E4]/20" : "bg-[#0B0B0B]/20"
        )}
        accessibilityRole="button"
        accessibilityLabel="Rate this app"
        accessibilityHint="Opens the App Store review page"
        onPress={async () => {
          try {
            console.log("[AsyncStorage] Opening rating page:", storeReviewUrl);
            await Linking.openURL(storeReviewUrl);
            await AsyncStorage.setItem(RATE_HAS_OPENED_RATING_PAGE_KEY, "1");
            console.log("[AsyncStorage] Saved hasOpenedRatingPage: true");
            setHasOpenedRatingPage(true);
          } catch (error) {
            console.error("[AsyncStorage] Error opening rating page:", error);
          }
        }}
      >
        <Button.Label
          className={cn("text-sm font-semibold flex-row items-center gap-10")}
        >
          <View className="flex-row items-center gap-2">
            <AppText
              className={cn(
                "text-sm font-semibold",
                props.isDark ? "text-white" : "text-[#0B0B0B]"
              )}
            >
              Give a review
            </AppText>
            <FontAwesome6 name="smile" size={16} color="white" />
          </View>
        </Button.Label>
      </Button>
    </View>
  );
}
