import { useLocalization } from "@/src/localization/localization-provider";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { GAME_THEMES } from "@/src/game-themes/game-theme-registry";
import type { LocalePreference } from "@/src/localization/locale";
import { Host } from "@expo/ui";
import {
  Column,
  ListItem,
  ModalBottomSheet,
  RadioButton,
  Text,
} from "@expo/ui/jetpack-compose";
import {
  fillMaxWidth,
  padding,
  selectable,
  selectableGroup,
} from "@expo/ui/jetpack-compose/modifiers";
import { useLingui } from "@lingui/react/macro";
import type { AppInfoSheetProps } from "./app-info-sheet.types";

export default function AppInfoSheet(props: AppInfoSheetProps) {
  const { t } = useLingui();
  const { localePreference, setLocalePreference } = useLocalization();
  const { theme, themeId, setThemeId } = useGameTheme();
  const options: { label: string; value: LocalePreference }[] = [
    { label: t`System`, value: "system" },
    { label: t`English`, value: "en" },
    { label: "Français", value: "fr" },
  ];

  if (!props.isPresented) {
    return null;
  }

  return (
    <Host
      matchContents
      seedColor={theme.chrome.accentColor}
      colorScheme={theme.chrome.statusBarStyle === "light" ? "dark" : "light"}
    >
      <ModalBottomSheet
        onDismissRequest={() => props.onIsPresentedChange(false)}
        contentColor={theme.chrome.controlIconColor}
        containerColor={theme.chrome.dialogSurfaceColor}
        skipPartiallyExpanded
      >
        <Column modifiers={[fillMaxWidth(), padding(24, 8, 24, 24)]}>
          <Text
            color={theme.chrome.controlIconColor}
            style={{ typography: "headlineSmall" }}
          >{t`About`}</Text>
          <Text
            color={theme.chrome.controlIconColor}
            style={{ typography: "titleSmall" }}
            modifiers={[padding(0, 24, 0, 8)]}
          >
            {t`Theme`}
          </Text>
          <Column modifiers={[selectableGroup()]}>
            {GAME_THEMES.map((theme) => (
              <ListItem
                key={theme.id}
                modifiers={[
                  fillMaxWidth(),
                  selectable(
                    themeId === theme.id,
                    () => void setThemeId(theme.id),
                    "radioButton",
                  ),
                ]}
              >
                <ListItem.HeadlineContent>
                  <Text>{theme.displayName}</Text>
                </ListItem.HeadlineContent>
                <ListItem.TrailingContent>
                  <RadioButton selected={themeId === theme.id} />
                </ListItem.TrailingContent>
              </ListItem>
            ))}
          </Column>
          <Text
            color={theme.chrome.controlIconColor}
            style={{ typography: "titleSmall" }}
            modifiers={[padding(0, 24, 0, 8)]}
          >
            {t`Language`}
          </Text>
          <Column modifiers={[selectableGroup()]}>
            {options.map((option) => (
              <ListItem
                key={option.value}
                modifiers={[
                  fillMaxWidth(),
                  selectable(
                    localePreference === option.value,
                    () => void setLocalePreference(option.value),
                    "radioButton",
                  ),
                ]}
              >
                <ListItem.HeadlineContent>
                  <Text>{option.label}</Text>
                </ListItem.HeadlineContent>
                <ListItem.TrailingContent>
                  <RadioButton selected={localePreference === option.value} />
                </ListItem.TrailingContent>
              </ListItem>
            ))}
          </Column>
          <Text
            color={
              theme.chrome.statusBarStyle === "light" ? "#BDBDBD" : "#666666"
            }
            style={{ typography: "bodySmall" }}
            modifiers={[padding(0, 24, 0, 0)]}
          >
            {t`JT Company. Made in 🇫🇷`}
          </Text>
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}
