import React from "react";
import { View, Text, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrendingBar from "./TrendingBar";

interface AppHeaderProps {
  title: string;
  showTrendingBar?: boolean;
}

export default function AppHeader({ title, showTrendingBar = true }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: "#000000",
        paddingTop: insets.top,
      }}
    >
      {/* Main Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800/50">
        <View className="flex-row items-center">
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 32, height: 32, marginRight: 10 }}
            resizeMode="contain"
          />
          <Text className="text-white text-20 font-bold">{title}</Text>
        </View>
      </View>

      {/* Trending Bar */}
      {showTrendingBar && <TrendingBar visible={true} />}
    </View>
  );
}
