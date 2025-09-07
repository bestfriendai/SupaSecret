import React from "react";
import { View, Text, Pressable, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePreferenceAwareHaptics } from "../utils/haptics";
import { getSwitchA11yProps } from "../utils/accessibility";

interface SettingsToggleProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

export default function SettingsToggle({
  title,
  description,
  value,
  onValueChange,
  icon,
  disabled = false,
}: SettingsToggleProps) {
  const { impactAsync } = usePreferenceAwareHaptics();

  const handleToggle = () => {
    if (!disabled) {
      impactAsync();
      onValueChange(!value);
    }
  };

  const a11yProps = getSwitchA11yProps(
    title,
    value,
    disabled
  );

  return (
    <Pressable
      className={`flex-row items-center justify-between py-3 ${disabled ? "opacity-50" : ""}`}
      onPress={handleToggle}
      disabled={disabled}
      {...a11yProps}
    >
      <View className="flex-row items-center flex-1">
        {icon && <Ionicons name={icon} size={20} color={value ? "#1D9BF0" : "#8B98A5"} style={{ marginRight: 12 }} />}
        <View className="flex-1">
          <Text className="text-white text-15 font-medium">{title}</Text>
          {description && <Text className="text-gray-500 text-13 mt-1">{description}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#374151", true: "#1D9BF0" }}
        thumbColor={value ? "#FFFFFF" : "#9CA3AF"}
        ios_backgroundColor="#374151"
        disabled={disabled}
        {...a11yProps}
      />
    </Pressable>
  );
}
