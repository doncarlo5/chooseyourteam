import { useLocalization } from "@/src/localization/localization-provider";
import { isLocalePreference } from "@/src/localization/locale";
import { isGameThemeId } from "@/src/game-themes/game-theme-id";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { GAME_THEMES } from "@/src/game-themes/game-theme-registry";
import { Host } from "@expo/ui";
import { BottomSheet, Form, Picker, Section, Text } from "@expo/ui/swift-ui";
import {
  background,
  environment,
  foregroundStyle,
  scrollContentBackground,
  frame,
  padding,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import { useLingui } from "@lingui/react/macro";
import type { AppInfoSheetProps } from "./app-info-sheet.types";

export default function AppInfoSheet(props: AppInfoSheetProps) {
  const { t } = useLingui();
  const { localePreference, setLocalePreference } = useLocalization();
  const { theme, themeId, setThemeId } = useGameTheme();

  return (
    <Host
      matchContents
      seedColor={theme.chrome.accentColor}
      colorScheme={theme.chrome.statusBarStyle === "light" ? "dark" : "light"}
    >
      <BottomSheet
        isPresented={props.isPresented}
        onIsPresentedChange={props.onIsPresentedChange}
        fitToContents
      >
        <Form
          modifiers={[
            environment(
              "colorScheme",
              theme.chrome.statusBarStyle === "light" ? "dark" : "light",
            ),
            foregroundStyle(theme.chrome.controlIconColor),
            padding({ top: 12 }),
            frame({ height: 520 }),
            scrollContentBackground("hidden"),
            background(theme.chrome.dialogSurfaceColor),
          ]}
        >
          <Section title={t`Theme`}>
            <Picker
              selection={themeId}
              onSelectionChange={(selection) => {
                if (isGameThemeId(selection)) {
                  void setThemeId(selection);
                }
              }}
              modifiers={[pickerStyle("inline")]}
            >
              {GAME_THEMES.map((theme) => (
                <Text key={theme.id} modifiers={[tag(theme.id)]}>
                  {theme.displayName}
                </Text>
              ))}
            </Picker>
          </Section>
          <Section
            title={t`Language`}
            footer={<Text>{t`JT Company. Made in 🇫🇷`}</Text>}
          >
            <Picker
              selection={localePreference}
              onSelectionChange={(selection) => {
                if (isLocalePreference(selection)) {
                  void setLocalePreference(selection);
                }
              }}
              modifiers={[pickerStyle("inline")]}
            >
              <Text modifiers={[tag("system")]}>{t`System`}</Text>
              <Text modifiers={[tag("en")]}>{t`English`}</Text>
              <Text modifiers={[tag("fr")]}>Français</Text>
            </Picker>
          </Section>
        </Form>
      </BottomSheet>
    </Host>
  );
}
