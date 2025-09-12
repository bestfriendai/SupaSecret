import React, { memo, useCallback } from "react";
import { Pressable, Text } from "react-native";
import { getButtonA11yProps } from "../utils/accessibility";

type Props = {
  period: number;
  label: string;
  active: boolean;
  onPress: (period: number) => void;
  onClearError?: () => void;
};

function TimePeriodButtonComponent({ period, label, active, onPress, onClearError }: Props) {
  const handlePress = useCallback(() => {
    onPress(period);
    onClearError?.();
  }, [onPress, period, onClearError]);

  return (
    <Pressable
      {...getButtonA11yProps(`Time period ${label}`, `Switch to ${label} time range`)}
      accessibilityRole="button"
      onPress={handlePress}
      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}
    >
      <Text style={{ color: active ? "#fff" : "#9CA3AF", fontSize: 14, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export const TimePeriodButton = memo(TimePeriodButtonComponent);

export default TimePeriodButton;
