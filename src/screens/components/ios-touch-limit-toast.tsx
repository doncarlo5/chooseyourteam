import { useLingui } from "@lingui/react/macro";
import { useGameTheme } from "@/src/game-themes/game-theme-provider";
import { Toast, type ToastComponentProps } from "heroui-native";
import { View } from "react-native";
import Svg, { Line } from "react-native-svg";

export default function IosTouchLimitToast(props: {
  toastProps: ToastComponentProps;
  onSelectSixPlayers?: () => void;
}) {
  const { t } = useLingui();
  const { theme } = useGameTheme();
  const iconColor = theme.start.foregroundColor;
  const handleSelectSixPlayers = () => {
    props.toastProps.hide(props.toastProps.id);
    props.onSelectSixPlayers?.();
  };

  return (
    <Toast
      {...props.toastProps}
      variant="default"
      background={null}
      className="flex-row items-center gap-3"
      style={[
        { boxShadow: "none" },
        theme.surfaces.card,
        {
          backgroundColor: theme.chrome.dialogSurfaceColor,
          borderColor: theme.surfaces.control.borderColor,
        },
      ]}
    >
      <View className="flex-1">
        <Toast.Title
          style={[
            theme.typography.title,
            {
              color: theme.chrome.controlIconColor,
              fontSize: 18,
              lineHeight: 24,
            },
          ]}
        >{t`Maximum 5 fingers`}</Toast.Title>
        <Toast.Description
          style={[
            theme.typography.body,
            {
              color: theme.chrome.controlIconColor,
              opacity: 0.75,
              fontSize: 14,
              lineHeight: 20,
            },
          ]}
        >{t`Go back and select 6 or more players.`}</Toast.Description>
      </View>
      {props.onSelectSixPlayers ? (
        <Toast.Action
          onPress={handleSelectSixPlayers}
          accessibilityLabel={t`Select 6 players`}
          accessibilityHint={t`Returns to team selection with 6 players`}
          background={null}
          style={[
            theme.surfaces.control,
            {
              width: 44,
              minWidth: 44,
              height: 44,
              minHeight: 44,
              paddingHorizontal: 0,
              backgroundColor: theme.start.backgroundColor,
              borderColor: theme.start.borderColor,
            },
          ]}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Line
              x1={5}
              y1={12}
              x2={19}
              y2={12}
              stroke={iconColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <Line
              x1={12}
              y1={5}
              x2={12}
              y2={19}
              stroke={iconColor}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </Svg>
        </Toast.Action>
      ) : null}
    </Toast>
  );
}
