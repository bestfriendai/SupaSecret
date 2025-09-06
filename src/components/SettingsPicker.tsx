import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePreferenceAwareHaptics } from "../utils/haptics";

interface SettingsPickerOption {
  value: string;
  label: string;
  description?: string;
}

interface SettingsPickerProps {
  title: string;
  description?: string;
  value: string;
  options: SettingsPickerOption[];
  onValueChange: (value: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

export default function SettingsPicker({
  title,
  description,
  value,
  options,
  onValueChange,
  icon,
  disabled = false,
}: SettingsPickerProps) {
  const { impactAsync } = usePreferenceAwareHaptics();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleOptionSelect = (optionValue: string) => {
    impactAsync();
    onValueChange(optionValue);
    setModalVisible(false);
  };

  const handlePress = () => {
    if (!disabled) {
      impactAsync();
      setModalVisible(true);
    }
  };

  return (
    <>
      <Pressable
        className={`flex-row items-center justify-between py-3 ${disabled ? "opacity-50" : ""}`}
        onPress={handlePress}
        disabled={disabled}
      >
        <View className="flex-row items-center flex-1">
          {icon && (
            <Ionicons 
              name={icon} 
              size={20} 
              color="#8B98A5" 
              style={{ marginRight: 12 }}
            />
          )}
          <View className="flex-1">
            <Text className="text-white text-15 font-medium">{title}</Text>
            {description && (
              <Text className="text-gray-500 text-13 mt-1">{description}</Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center">
          <Text className="text-blue-400 text-14 mr-2">
            {selectedOption?.label || value}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#8B98A5" />
        </View>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-gray-900 rounded-t-3xl">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-700">
              <Text className="text-white text-18 font-bold">{title}</Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#8B98A5" />
              </Pressable>
            </View>
            <ScrollView className="max-h-80">
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  className="flex-row items-center justify-between p-4 border-b border-gray-800/50"
                  onPress={() => handleOptionSelect(option.value)}
                >
                  <View className="flex-1">
                    <Text className="text-white text-16 font-medium">
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text className="text-gray-500 text-13 mt-1">
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {value === option.value && (
                    <Ionicons name="checkmark" size={20} color="#1D9BF0" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
