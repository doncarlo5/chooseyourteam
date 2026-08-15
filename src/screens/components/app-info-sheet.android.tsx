import { useLocalization } from "@/src/localization/localization-provider";
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
  clickable,
  fillMaxWidth,
  padding,
  selectable,
  selectableGroup,
} from "@expo/ui/jetpack-compose/modifiers";
import { useLingui } from "@lingui/react/macro";
import { Linking } from "react-native";
import type { AppInfoSheetProps } from "./app-info-sheet.types";

const PORTFOLIO_URL = "https://projulienthomas.vercel.app";

const openPortfolio = async () => {
  try {
    await Linking.openURL(PORTFOLIO_URL);
  } catch (error) {
    console.error("[About] Unable to open portfolio:", error);
  }
};

export default function AppInfoSheet(props: AppInfoSheetProps) {
  const { t } = useLingui();
  const { localePreference, setLocalePreference } = useLocalization();
  const options: { label: string; value: LocalePreference }[] = [
    { label: t`System`, value: "system" },
    { label: t`English`, value: "en" },
    { label: "Français", value: "fr" },
  ];

  if (!props.isPresented) {
    return null;
  }

  return (
    <Host matchContents>
      <ModalBottomSheet
        onDismissRequest={() => props.onIsPresentedChange(false)}
        skipPartiallyExpanded
      >
        <Column modifiers={[fillMaxWidth(), padding(24, 8, 24, 24)]}>
          <Text style={{ typography: "headlineSmall" }}>{t`About`}</Text>
          <Text
            style={{ typography: "titleSmall" }}
            modifiers={[padding(0, 24, 0, 8)]}
          >
            {t`Credits`}
          </Text>
          <ListItem>
            <ListItem.HeadlineContent>
              <Text>{t`Ideas or suggestions?`}</Text>
            </ListItem.HeadlineContent>
          </ListItem>
          <ListItem modifiers={[clickable(() => void openPortfolio())]}>
            <ListItem.HeadlineContent>
              <Text>{t`Portfolio`}</Text>
            </ListItem.HeadlineContent>
            <ListItem.SupportingContent>
              <Text>{PORTFOLIO_URL}</Text>
            </ListItem.SupportingContent>
          </ListItem>
          <Text
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
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}
