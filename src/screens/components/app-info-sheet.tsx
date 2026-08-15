import { useLocalization } from "@/src/localization/localization-provider";
import { isLocalePreference } from "@/src/localization/locale";
import { useLingui } from "@lingui/react/macro";
import { Link } from "expo-router";
import { Dialog, Label, Radio, RadioGroup, Separator, cn } from "heroui-native";
import { View } from "react-native";
import type { AppInfoSheetProps } from "./app-info-sheet.types";

const PORTFOLIO_URL = "https://projulienthomas.vercel.app";

export default function AppInfoSheet(props: AppInfoSheetProps) {
  const { t } = useLingui();
  const { localePreference, setLocalePreference } = useLocalization();
  const options = [
    { label: t`System`, value: "system" },
    { label: t`English`, value: "en" },
    { label: "Français", value: "fr" },
  ];

  return (
    <Dialog
      animation="disable-all"
      isOpen={props.isPresented}
      onOpenChange={props.onIsPresentedChange}
    >
      <Dialog.Portal className={cn("items-center !justify-end !p-0")}>
        <Dialog.Overlay
          variant="default"
          animation="disabled"
          isAnimatedStyleActive={false}
          className={cn("bg-black/20")}
        />
        <Dialog.Content
          background={null}
          animation="disabled"
          className={cn(
            "w-full max-w-lg !rounded-b-none rounded-t-3xl bg-white px-6 pb-8 pt-5",
          )}
        >
          <View className={cn("flex-row items-center justify-between")}>
            <Dialog.Title>{t`About`}</Dialog.Title>
            <Dialog.Close accessibilityLabel={t`Close About`} />
          </View>
          <View className={cn("mt-6 gap-3")}>
            <Label className={cn("text-sm font-semibold")}>{t`Credits`}</Label>
            <Label>{t`Ideas or suggestions?`}</Label>
            <Link
              href={PORTFOLIO_URL}
              target="_blank"
              className={cn("self-start px-4 py-2 text-blue-600")}
            >
              {t`Portfolio`}
            </Link>
          </View>
          <Separator className={cn("my-6")} />
          <View className={cn("gap-3")}>
            <Label className={cn("text-sm font-semibold")}>{t`Language`}</Label>
            <RadioGroup
              animation="disable-all"
              value={localePreference}
              onValueChange={(value) => {
                if (isLocalePreference(value)) {
                  void setLocalePreference(value);
                }
              }}
              className={cn("gap-4")}
            >
              {options.map((option) => (
                <RadioGroup.Item key={option.value} value={option.value}>
                  <Radio />
                  <Label>{option.label}</Label>
                </RadioGroup.Item>
              ))}
            </RadioGroup>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
