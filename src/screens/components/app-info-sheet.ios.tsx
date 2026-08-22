import { useLocalization } from "@/src/localization/localization-provider";
import { isLocalePreference } from "@/src/localization/locale";
import { isGameThemeId } from "@/src/game-themes/game-theme-id";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { GAME_THEMES } from "@/src/game-themes/game-theme-registry";
import { Host } from "@expo/ui";
import {
  BottomSheet,
  Form,
  Link,
  Picker,
  Section,
  Text,
} from "@expo/ui/swift-ui";
import {
  frame,
  listRowSeparator,
  padding,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import { useLingui } from "@lingui/react/macro";
import type { AppInfoSheetProps } from "./app-info-sheet.types";

const PORTFOLIO_URL = "https://projulienthomas.vercel.app";

export default function AppInfoSheet(props: AppInfoSheetProps) {
  const { t } = useLingui();
  const { localePreference, setLocalePreference } = useLocalization();
  const { themeId, setThemeId } = useGameTheme();

  return (
    <Host matchContents>
      <BottomSheet
        isPresented={props.isPresented}
        onIsPresentedChange={props.onIsPresentedChange}
        fitToContents
      >
        <Form modifiers={[padding({ top: 12 }), frame({ height: 590 })]}>
          <Section title={t`Credits`}>
            <Text modifiers={[listRowSeparator("hidden", "bottom")]}>
              {t`Ideas or suggestions?`}
            </Text>
            <Link
              label={t`Portfolio`}
              destination={PORTFOLIO_URL}
              modifiers={[listRowSeparator("hidden", "top")]}
            />
          </Section>
          <Section title={t`Language`}>
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
        </Form>
      </BottomSheet>
    </Host>
  );
}
