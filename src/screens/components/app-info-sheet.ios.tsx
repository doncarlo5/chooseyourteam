import { useLocalization } from "@/src/localization/localization-provider";
import { isLocalePreference } from "@/src/localization/locale";
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

  return (
    <Host matchContents>
      <BottomSheet
        isPresented={props.isPresented}
        onIsPresentedChange={props.onIsPresentedChange}
        fitToContents
      >
        <Form modifiers={[padding({ top: 12 }), frame({ height: 470 })]}>
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
        </Form>
      </BottomSheet>
    </Host>
  );
}
