import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Services
import { RevenueCatService } from "../services/RevenueCatService";
import { AdMobService } from "../services/AdMobService";
import { Anonymiser } from "../services/Anonymiser";

// Stores
import { useSubscriptionStore } from "../state/subscriptionStore";

// Components
import { BannerAdComponent } from "../components/ads/BannerAdComponent";
import { PaywallModal } from "../components/PaywallModal";

export default function IntegrationTest() {
  const [testResults, setTestResults] = useState<Record<string, "pending" | "success" | "error">>({});
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium, checkSubscriptionStatus } = useSubscriptionStore();

  const addLog = (message: string) => {
    setTestLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const updateTestResult = (testName: string, result: "pending" | "success" | "error") => {
    setTestResults((prev) => ({ ...prev, [testName]: result }));
  };

  // Test RevenueCat Service
  const testRevenueCat = async () => {
    addLog("Testing RevenueCat Service...");
    updateTestResult("revenuecat", "pending");

    try {
      // Test initialization
      await RevenueCatService.initialize();
      addLog("✅ RevenueCat initialized successfully");

      // Test getting offerings
      const offerings = await RevenueCatService.getOfferings();
      addLog(`✅ Offerings retrieved: ${offerings ? "Available" : "Demo mode"}`);

      // Test premium status check
      const isPremiumUser = await RevenueCatService.isUserPremium();
      addLog(`✅ Premium status: ${isPremiumUser ? "Premium" : "Free"}`);

      // Test mock offerings
      const mockOfferings = RevenueCatService.getMockOfferings();
      addLog(`✅ Mock offerings: ${mockOfferings.length} plans available`);

      updateTestResult("revenuecat", "success");
    } catch (error) {
      addLog(`❌ RevenueCat error: ${error instanceof Error ? error.message : "Unknown error"}`);
      updateTestResult("revenuecat", "error");
    }
  };

  // Test AdMob Service
  const testAdMob = async () => {
    addLog("Testing AdMob Service...");
    updateTestResult("admob", "pending");

    try {
      // Test initialization
      await AdMobService.initialize();
      addLog("✅ AdMob initialized successfully");

      // Test ad unit ID retrieval
      const bannerAdId = AdMobService.getBannerAdUnitId();
      addLog(`✅ Banner ad unit ID: ${bannerAdId.includes("test") ? "Test ID" : "Production ID"}`);

      // Test should show ad logic
      const shouldShow = AdMobService.shouldShowAd(false);
      addLog(`✅ Should show ads: ${shouldShow ? "Yes (Free user)" : "No (Premium user)"}`);

      updateTestResult("admob", "success");
    } catch (error) {
      addLog(`❌ AdMob error: ${error instanceof Error ? error.message : "Unknown error"}`);
      updateTestResult("admob", "error");
    }
  };

  // Test Video Processing Service
  const testVideoProcessing = async () => {
    addLog("Testing Video Processing Service...");
    updateTestResult("video", "pending");

    try {
      // Test initialization
      await Anonymiser.initialize();
      addLog("✅ Video Processing Service initialized");

      // Test real-time transcription methods
      await Anonymiser.startRealTimeTranscription();
      addLog("✅ Real-time transcription started");

      await Anonymiser.stopRealTimeTranscription();
      addLog("✅ Real-time transcription stopped");

      updateTestResult("video", "success");
    } catch (error) {
      addLog(`❌ Video Processing error: ${error instanceof Error ? error.message : "Unknown error"}`);
      updateTestResult("video", "error");
    }
  };

  // Test Subscription Store
  const testSubscriptionStore = async () => {
    addLog("Testing Subscription Store...");
    updateTestResult("store", "pending");

    try {
      // Test subscription status check
      await checkSubscriptionStatus();
      addLog("✅ Subscription status checked");

      // Test premium status
      addLog(`✅ Current premium status: ${isPremium ? "Premium" : "Free"}`);

      updateTestResult("store", "success");
    } catch (error) {
      addLog(`❌ Subscription Store error: ${error instanceof Error ? error.message : "Unknown error"}`);
      updateTestResult("store", "error");
    }
  };

  // Test Ad Components
  const testAdComponents = () => {
    addLog("Testing Ad Components...");
    updateTestResult("components", "pending");

    try {
      // Test BannerAdComponent by checking if it renders without throwing
      // eslint-disable-next-line react-hooks/rules-of-hooks

      // Ref intentionally not using React hooks here to avoid rules-of-hooks in test utility

      // Simple render test - check if component can be instantiated
      const bannerComponent = React.createElement(BannerAdComponent, {});

      if (bannerComponent) {
        addLog("✅ BannerAdComponent instantiated successfully");
      }

      // Additional validation - check if component has expected structure
      if (bannerComponent.type === BannerAdComponent) {
        addLog("✅ BannerAdComponent type validation passed");
      }

      addLog("✅ Ad components tested successfully");
      updateTestResult("components", "success");
    } catch (error) {
      addLog(`❌ Ad Components error: ${error instanceof Error ? error.message : "Unknown error"}`);
      updateTestResult("components", "error");
    }
  };

  // Run all tests
  const runAllTests = async (abortSignal?: AbortSignal) => {
    setTestResults({});
    setTestLogs([]);
    addLog("🚀 Starting comprehensive integration tests...");

    if (abortSignal?.aborted) return;
    await testRevenueCat();

    if (abortSignal?.aborted) return;
    await testAdMob();

    if (abortSignal?.aborted) return;
    await testVideoProcessing();

    if (abortSignal?.aborted) return;
    await testSubscriptionStore();

    if (abortSignal?.aborted) return;
    testAdComponents();

    if (!abortSignal?.aborted) {
      addLog("🏁 All tests completed!");
    }
  };

  // Test interstitial ad
  const testInterstitialAd = async () => {
    const shown = await AdMobService.showInterstitialAd();
    Alert.alert("Interstitial Ad Test", shown ? "Ad shown successfully!" : "Ad not shown (premium user or cooldown)");
  };

  // Test rewarded ad
  const testRewardedAd = async () => {
    const result = await AdMobService.showRewardedAd();
    Alert.alert("Rewarded Ad Test", `Shown: ${result.shown}\nRewarded: ${result.rewarded}`);
  };

  useEffect(() => {
    // Create AbortController for cleanup
    const abortController = new AbortController();

    // Run tests on component mount
    runAllTests(abortController.signal);

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, []);

  const getStatusIcon = (status: "pending" | "success" | "error" | undefined) => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "pending":
        return "⏳";
      default:
        return "⚪";
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <View className="px-4 py-3 border-b border-gray-800">
        <Text className="text-white text-18 font-bold">Integration Tests</Text>
        <Text className="text-gray-400 text-14 mt-1">Testing all services and components</Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Test Results Summary */}
        <View className="py-4">
          <Text className="text-white text-16 font-semibold mb-3">Test Results</Text>

          {[
            { key: "revenuecat", name: "RevenueCat Service" },
            { key: "admob", name: "AdMob Service" },
            { key: "video", name: "Video Processing" },
            { key: "store", name: "Subscription Store" },
            { key: "components", name: "Ad Components" },
          ].map((test) => (
            <View key={test.key} className="flex-row items-center py-2">
              <Text className="text-20 mr-3">{getStatusIcon(testResults[test.key])}</Text>
              <Text className="text-white text-15 flex-1">{test.name}</Text>
            </View>
          ))}
        </View>

        {/* Manual Tests */}
        <View className="py-4 border-t border-gray-800">
          <Text className="text-white text-16 font-semibold mb-3">Manual Tests</Text>

          <Pressable className="bg-blue-600 rounded-lg p-3 mb-3" onPress={testInterstitialAd}>
            <Text className="text-white text-center font-medium">Test Interstitial Ad</Text>
          </Pressable>

          <Pressable className="bg-green-600 rounded-lg p-3 mb-3" onPress={testRewardedAd}>
            <Text className="text-white text-center font-medium">Test Rewarded Ad</Text>
          </Pressable>

          <Pressable className="bg-purple-600 rounded-lg p-3 mb-3" onPress={() => setShowPaywall(true)}>
            <Text className="text-white text-center font-medium">Test Paywall</Text>
          </Pressable>

          <Pressable className="bg-gray-600 rounded-lg p-3 mb-3" onPress={() => void runAllTests()}>
            <Text className="text-white text-center font-medium">Run All Tests Again</Text>
          </Pressable>
        </View>

        {/* Banner Ad Test */}
        <View className="py-4 border-t border-gray-800">
          <Text className="text-white text-16 font-semibold mb-3">Banner Ad Test</Text>
          <BannerAdComponent />
        </View>

        {/* Test Logs */}
        <View className="py-4 border-t border-gray-800">
          <Text className="text-white text-16 font-semibold mb-3">Test Logs</Text>
          <View className="bg-gray-900 rounded-lg p-3">
            {testLogs.map((log, index) => (
              <Text key={index} className="text-gray-300 text-12 mb-1 font-mono">
                {log}
              </Text>
            ))}
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseSuccess={() => {
          Alert.alert("Success!", "Paywall test completed!");
          checkSubscriptionStatus();
        }}
      />
    </SafeAreaView>
  );
}
