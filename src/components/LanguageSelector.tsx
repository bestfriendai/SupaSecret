import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t, getCurrentLocale, setLocale, getSupportedLocales, SupportedLocale } from "../utils/i18n";
import { usePreferenceAwareHaptics } from "../utils/haptics";

interface LanguageSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  onLanguageChange?: (locale: SupportedLocale) => void;
}

const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
};

const LANGUAGE_FLAGS: Record<SupportedLocale, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  pt: "🇵🇹",
  it: "🇮🇹",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
};

export default function LanguageSelector({ isVisible, onClose, onLanguageChange }: LanguageSelectorProps) {
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(getCurrentLocale() as SupportedLocale);
  const { impactAsync } = usePreferenceAwareHaptics();

  const handleLanguageSelect = async (locale: SupportedLocale) => {
    if (locale === currentLocale) {
      onClose();
      return;
    }

    try {
      setLocale(locale);
      setCurrentLocale(locale);
      onLanguageChange?.(locale);
      impactAsync();

      // Close modal after a brief delay to show selection
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.warn("Failed to change language:", error);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-gray-900 rounded-t-3xl max-h-[70%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-700">
            <Text className="text-white text-18 font-semibold">{t("settings.language")}</Text>
            <Pressable onPress={onClose} className="w-8 h-8 items-center justify-center rounded-full bg-gray-800">
              <Ionicons name="close" size={20} color="#8B98A5" />
            </Pressable>
          </View>

          {/* Language List */}
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-4">
              {getSupportedLocales().map((locale) => (
                <Pressable
                  key={locale}
                  onPress={() => handleLanguageSelect(locale)}
                  className={`flex-row items-center p-4 rounded-xl mb-2 ${
                    locale === currentLocale ? "bg-blue-600/20 border border-blue-500/30" : "bg-gray-800/50"
                  }`}
                >
                  {/* Flag */}
                  <Text className="text-24 mr-3">{LANGUAGE_FLAGS[locale]}</Text>

                  {/* Language Name */}
                  <View className="flex-1">
                    <Text
                      className={`text-16 font-medium ${locale === currentLocale ? "text-blue-400" : "text-white"}`}
                    >
                      {LANGUAGE_NAMES[locale]}
                    </Text>
                    {locale === "en" && <Text className="text-gray-400 text-13 mt-1">Default</Text>}
                  </View>

                  {/* Selection Indicator */}
                  {locale === currentLocale && (
                    <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center">
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Footer Info */}
            <View className="p-4 pt-0">
              <Text className="text-gray-500 text-13 text-center leading-5">
                Language changes will take effect immediately. Some text may require restarting the app.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Hook for easy language selection
export const useLanguageSelector = () => {
  const [isVisible, setIsVisible] = useState(false);

  const showLanguageSelector = () => setIsVisible(true);
  const hideLanguageSelector = () => setIsVisible(false);

  return {
    isVisible,
    showLanguageSelector,
    hideLanguageSelector,
    LanguageSelector: (props: Omit<LanguageSelectorProps, "isVisible" | "onClose">) => (
      <LanguageSelector {...props} isVisible={isVisible} onClose={hideLanguageSelector} />
    ),
  };
};
