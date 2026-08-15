import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import AppInfoSheet from "./app-info-sheet";
import BottomActionButton from "./bottom-action-button";

export default function AppInfoButton() {
  const { t } = useLingui();
  const [isPresented, setIsPresented] = useState(false);

  return (
    <>
      <BottomActionButton
        side="left"
        iconName="information-outline"
        accessibilityLabel={t`About`}
        accessibilityHint={t`Opens developer credits and language settings`}
        onPress={() => setIsPresented(true)}
      />
      <AppInfoSheet
        isPresented={isPresented}
        onIsPresentedChange={setIsPresented}
      />
    </>
  );
}
