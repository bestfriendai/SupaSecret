import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RevenueCatService } from "../services/RevenueCatService";
import { AdMobService } from "../services/AdMobService";

interface ApiKeyStatus {
  key: string;
  name: string;
  status: "missing" | "present" | "valid" | "invalid";
  value?: string;
  error?: string;
}

export default function ApiKeyValidationTest() {
  const [apiKeys, setApiKeys] = useState<ApiKeyStatus[]>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const requiredApiKeys = [
    { key: "EXPO_PUBLIC_REVENUECAT_IOS_KEY", name: "RevenueCat iOS" },
    { key: "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY", name: "RevenueCat Android" },
    { key: "EXPO_PUBLIC_ADMOB_IOS_APP_ID", name: "AdMob iOS App ID" },
    { key: "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID", name: "AdMob Android App ID" },
    { key: "EXPO_PUBLIC_ADMOB_BANNER_ID", name: "AdMob Banner ID" },
    { key: "EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID", name: "AdMob Interstitial ID" },
    { key: "EXPO_PUBLIC_ADMOB_REWARDED_ID", name: "AdMob Rewarded ID" },
  ];

  const checkApiKeys = () => {
    const keyStatuses: ApiKeyStatus[] = requiredApiKeys.map(({ key, name }) => {
      const value = process.env[key];
      const status = value ? "present" : "missing";

      return {
        key,
        name,
        status,
        value: value ? `${value.substring(0, 10)}...` : undefined,
      };
    });

    setApiKeys(keyStatuses);
  };

  const testRevenueCatIntegration = async () => {
    setIsLoading(true);
    try {
      await RevenueCatService.initialize();

      const offerings = await RevenueCatService.getOfferings();
      const isPremium = await RevenueCatService.isUserPremium();
      const mockOfferings = RevenueCatService.getMockOfferings();

      setTestResults((prev) => ({
        ...prev,
        revenuecat: {
          initialized: true,
          offerings: offerings ? "Available" : "Demo mode",
          isPremium,
          mockOfferings: mockOfferings.length,
          status: "success",
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        revenuecat: {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
    setIsLoading(false);
  };

  const testAdMobIntegration = async () => {
    setIsLoading(true);
    try {
      await AdMobService.initialize();

      const bannerAdId = AdMobService.getBannerAdUnitId();
      const shouldShowAds = AdMobService.shouldShowAd(false);

      setTestResults((prev) => ({
        ...prev,
        admob: {
          initialized: true,
          bannerAdId: bannerAdId.includes("test") ? "Test ID" : "Production ID",
          shouldShowAds,
          status: "success",
        },
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        admob: {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
    setIsLoading(false);
  };

  const testAdMobAds = async () => {
    try {
      // Test interstitial ad
      const interstitialShown = await AdMobService.showInterstitialAd();

      // Test rewarded ad
      const rewardedResult = await AdMobService.showRewardedAd();

      Alert.alert(
        "Ad Test Results",
        `Interstitial: ${interstitialShown ? "Shown" : "Not shown"}\nRewarded: ${rewardedResult.shown ? "Shown" : "Not shown"}`,
      );
    } catch (error) {
      Alert.alert("Ad Test Error", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const runAllTests = async () => {
    checkApiKeys();
    await testRevenueCatIntegration();
    await testAdMobIntegration();
  };

  useEffect(() => {
    checkApiKeys();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return "✅";
      case "missing":
        return "❌";
      case "valid":
        return "🟢";
      case "invalid":
        return "🔴";
      case "success":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⚪";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
      case "valid":
      case "success":
        return "text-green-400";
      case "missing":
      case "invalid":
      case "error":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-3 border-b border-gray-800">
        <Text className="text-white text-18 font-bold">API Key Validation</Text>
        <Text className="text-gray-400 text-14 mt-1">Check API keys and service integration</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* API Keys Status */}
        <View className="py-4">
          <Text className="text-white text-16 font-semibold mb-3">API Keys Status</Text>

          {apiKeys.map((apiKey) => (
            <View key={apiKey.key} className="flex-row items-center py-2 border-b border-gray-800">
              <Text className="text-20 mr-3">{getStatusIcon(apiKey.status)}</Text>
              <View className="flex-1">
                <Text className="text-white text-15">{apiKey.name}</Text>
                <Text className="text-gray-500 text-12">{apiKey.key}</Text>
                {apiKey.value && <Text className="text-gray-400 text-11 font-mono">{apiKey.value}</Text>}
              </View>
              <Text className={`text-13 font-medium ${getStatusColor(apiKey.status)}`}>
                {apiKey.status.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>

        {/* Test Controls */}
        <View className="py-4 border-t border-gray-800">
          <Text className="text-white text-16 font-semibold mb-3">Service Tests</Text>

          <Pressable className="bg-blue-600 rounded-lg p-3 mb-3" onPress={runAllTests} disabled={isLoading}>
            <Text className="text-white text-center font-medium">{isLoading ? "Testing..." : "Run All Tests"}</Text>
          </Pressable>

          <Pressable
            className="bg-green-600 rounded-lg p-3 mb-3"
            onPress={testRevenueCatIntegration}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-medium">Test RevenueCat</Text>
          </Pressable>

          <Pressable className="bg-purple-600 rounded-lg p-3 mb-3" onPress={testAdMobIntegration} disabled={isLoading}>
            <Text className="text-white text-center font-medium">Test AdMob</Text>
          </Pressable>

          <Pressable className="bg-orange-600 rounded-lg p-3 mb-3" onPress={testAdMobAds}>
            <Text className="text-white text-center font-medium">Test Ads Display</Text>
          </Pressable>
        </View>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <View className="py-4 border-t border-gray-800">
            <Text className="text-white text-16 font-semibold mb-3">Test Results</Text>

            {Object.entries(testResults).map(([service, result]: [string, any]) => (
              <View key={service} className="bg-gray-900 rounded-lg p-3 mb-3">
                <View className="flex-row items-center mb-2">
                  <Text className="text-20 mr-2">{getStatusIcon(result.status)}</Text>
                  <Text className="text-white text-15 font-medium capitalize">{service}</Text>
                </View>

                {result.status === "success" ? (
                  <View>
                    {Object.entries(result).map(([key, value]: [string, any]) => {
                      if (key === "status") return null;
                      return (
                        <Text key={key} className="text-gray-300 text-13 mb-1">
                          <Text className="text-blue-400 capitalize">{key}:</Text> {String(value)}
                        </Text>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-red-400 text-13">{result.error}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View className="py-4 border-t border-gray-800">
          <Text className="text-white text-16 font-semibold mb-3">Setup Instructions</Text>

          <View className="bg-gray-900 rounded-lg p-3">
            <Text className="text-gray-300 text-14 mb-2">To enable production features:</Text>
            <Text className="text-gray-300 text-13 mb-1">1. Create .env file in project root</Text>
            <Text className="text-gray-300 text-13 mb-1">2. Add your API keys (see .env.example)</Text>
            <Text className="text-gray-300 text-13 mb-1">3. Build development client with EAS</Text>
            <Text className="text-gray-300 text-13">4. Test with real API keys</Text>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
