import { useLingui } from "@lingui/react";
import { cn } from "heroui-native";
import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

export const AppText = React.forwardRef<RNText, RNTextProps>((props, ref) => {
  const { i18n } = useLingui();
  const language = i18n.locale === "pseudo" ? "en" : i18n.locale;

  return (
    <RNText
      {...props}
      ref={ref}
      className={cn("font-normal", props.className)}
      lang={language}
    />
  );
});

AppText.displayName = "AppText";
