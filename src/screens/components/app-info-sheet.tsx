import { useLocalization } from "@/src/localization/localization-provider";
import { isLocalePreference } from "@/src/localization/locale";
import { isGameThemeId } from "@/src/game-themes/game-theme-id";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { GAME_THEMES } from "@/src/game-themes/game-theme-registry";
import { useLingui } from "@lingui/react/macro";
import { Dialog, Label, Radio, RadioGroup, Separator, cn } from "heroui-native";
import { View } from "react-native";
import type { AppInfoSheetProps } from "./app-info-sheet.types";

export default function AppInfoSheet(props: AppInfoSheetProps) {
  const { t } = useLingui();
  const { localePreference, setLocalePreference } = useLocalization();
  const { theme, themeId, setThemeId } = useGameTheme();
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
          style={[
            theme.surfaces.card,
            { backgroundColor: theme.chrome.dialogSurfaceColor },
          ]}
          background={null}
          animation="disabled"
          className={cn(
            "w-full max-w-lg !rounded-b-none rounded-t-3xl bg-white px-6 pb-8 pt-5",
          )}
        >
          <View className={cn("flex-row items-center justify-between")}>
            <Dialog.Title
              className={theme.chrome.primaryTextClassName}
              style={[
                theme.typography.title,
                { color: theme.chrome.controlIconColor },
              ]}
            >{t`About`}</Dialog.Title>
            <Dialog.Close accessibilityLabel={t`Close About`} />
          </View>
          <View className={cn("mt-6 gap-3")}>
            <Label>
              <Label.Text
                style={[
                  theme.typography.title,
                  { color: theme.chrome.controlIconColor },
                ]}
                className={cn("text-sm", theme.chrome.primaryTextClassName)}
              >{t`Theme`}</Label.Text>
            </Label>
            <RadioGroup
              animation="disable-all"
              value={themeId}
              onValueChange={(value) => {
                if (isGameThemeId(value)) {
                  void setThemeId(value);
                }
              }}
              className={cn("gap-4")}
            >
              {GAME_THEMES.map((option) => (
                <RadioGroup.Item key={option.id} value={option.id}>
                  <Radio style={{ borderColor: theme.chrome.accentColor }}>
                    <Radio.Indicator
                      style={{
                        backgroundColor: "transparent",
                        borderColor: theme.chrome.accentColor,
                        borderWidth: 2,
                      }}
                    >
                      <Radio.IndicatorThumb
                        style={{ backgroundColor: theme.chrome.accentColor }}
                      />
                    </Radio.Indicator>
                  </Radio>
                  <Label>
                    <Label.Text
                      className={theme.chrome.primaryTextClassName}
                      style={[
                        theme.typography.body,
                        { color: theme.chrome.controlIconColor },
                      ]}
                    >
                      {option.displayName}
                    </Label.Text>
                  </Label>
                </RadioGroup.Item>
              ))}
            </RadioGroup>
          </View>
          <Separator className={cn("my-6")} />
          <View className={cn("gap-3")}>
            <Label>
              <Label.Text
                style={[
                  theme.typography.title,
                  { color: theme.chrome.controlIconColor },
                ]}
                className={cn("text-sm", theme.chrome.primaryTextClassName)}
              >{t`Language`}</Label.Text>
            </Label>
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
                  <Radio style={{ borderColor: theme.chrome.accentColor }}>
                    <Radio.Indicator
                      style={{
                        backgroundColor: "transparent",
                        borderColor: theme.chrome.accentColor,
                        borderWidth: 2,
                      }}
                    >
                      <Radio.IndicatorThumb
                        style={{ backgroundColor: theme.chrome.accentColor }}
                      />
                    </Radio.Indicator>
                  </Radio>
                  <Label>
                    <Label.Text
                      className={theme.chrome.primaryTextClassName}
                      style={[
                        theme.typography.body,
                        { color: theme.chrome.controlIconColor },
                      ]}
                    >
                      {option.label}
                    </Label.Text>
                  </Label>
                </RadioGroup.Item>
              ))}
            </RadioGroup>
          </View>
          <Separator className={cn("my-6")} />
          <Label>
            <Label.Text
              style={[
                theme.typography.body,
                { color: theme.chrome.controlIconColor },
              ]}
              className={cn(
                "text-center text-sm",
                theme.chrome.secondaryTextClassName,
              )}
            >
              {t`JT Company. Made in 🇫🇷`}
            </Label.Text>
          </Label>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
