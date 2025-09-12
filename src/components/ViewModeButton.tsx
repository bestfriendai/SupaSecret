import React, { memo, useCallback } from "react";
import { Pressable, Text } from "react-native";
import { getTabA11yProps } from "../utils/accessibility";

type Props = {
  mode: "hashtags" | "secrets";
  label: string;
  active: boolean;
  onPress: (mode: "hashtags" | "secrets") => void;
  index?: number;
  total?: number;
};

function ViewModeButtonComponent({ mode, label, active, onPress, index = 0, total = 2 }: Props) {
  const handlePress = useCallback(() => onPress(mode), [onPress, mode]);

  return (
    <Pressable
      {...getTabA11yProps(label, active, index, total)}
      onPress={handlePress}
      accessibilityRole="tab"
      style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: active ? 2 : 0, borderBottomColor: "#1D9BF0" }}
    >
      <Text style={{ color: active ? "#fff" : "#9CA3AF", fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export const ViewModeButton = memo(ViewModeButtonComponent);

export default ViewModeButton;
