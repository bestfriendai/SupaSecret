/**
 * WebView Screen for displaying privacy policy, terms of service, and help content
 */

import React, { useState, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, Linking, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

type RootStackParamList = {
  WebView: {
    url: string;
    title: string;
  };
};

type WebViewScreenRouteProp = RouteProp<RootStackParamList, "WebView">;
type WebViewScreenNavigationProp = StackNavigationProp<RootStackParamList, "WebView">;

// URL allowlist for security - only allow these domains and schemes
const ALLOWED_SCHEMES = ["http", "https"];
const ALLOWED_DOMAINS = [
  // Add your trusted domains here
  "example.com",
  "privacy-policy-domain.com",
  "terms-of-service-domain.com",
  "help-domain.com",
  // Add more domains as needed
];

// Helper function to validate URLs
const isUrlAllowed = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);

    // Check if scheme is allowed
    if (!ALLOWED_SCHEMES.includes(parsedUrl.protocol.replace(":", ""))) {
      return false;
    }

    // For now, allow all https/http URLs - you can uncomment domain checking if needed
    // if (!ALLOWED_DOMAINS.some(domain => parsedUrl.hostname.endsWith(domain))) {
    //   return false;
    // }

    return true;
  } catch (error) {
    // Invalid URL
    return false;
  }
};

const WebViewScreen: React.FC = () => {
  const navigation = useNavigation<WebViewScreenNavigationProp>();
  const route = useRoute<WebViewScreenRouteProp>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [webviewKey, setWebviewKey] = useState(0);
  const webViewRef = useRef<WebView>(null);

  const { url, title } = route.params;

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    // Force WebView to remount by changing the key
    setWebviewKey((prev) => prev + 1);
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
    Alert.alert(
      "Error Loading Page",
      "Unable to load the requested page. Please check your internet connection and try again.",
      [
        { text: "Retry", onPress: handleRetry },
        { text: "Close", onPress: () => navigation.goBack() },
      ],
    );
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  // Handle navigation requests (iOS)
  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url } = request;

    // Allow the initial URL
    if (url === route.params.url) {
      return true;
    }

    // Check if URL is allowed
    if (!isUrlAllowed(url)) {
      console.warn("Blocked navigation to disallowed URL:", url);
      Alert.alert("Navigation Blocked", "This link cannot be opened for security reasons.", [{ text: "OK" }]);
      return false;
    }

    // For external allowed domains, open in system browser
    try {
      const parsedUrl = new URL(url);
      const currentUrl = new URL(route.params.url);

      if (parsedUrl.hostname !== currentUrl.hostname) {
        Linking.openURL(url);
        return false;
      }
    } catch (error) {
      console.warn("Error parsing URL for external navigation:", error);
    }

    return true;
  };

  // Handle navigation state changes (Android fallback)
  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;

    // Skip validation for the initial URL
    if (url === route.params.url) {
      return;
    }

    // Check if URL is allowed
    if (!isUrlAllowed(url)) {
      console.warn("Blocked navigation to disallowed URL:", url);
      Alert.alert("Navigation Blocked", "This link cannot be opened for security reasons.", [{ text: "OK" }]);
      // Note: On Android, we can't prevent navigation here, but we can warn the user
      return;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-800">
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text className="text-white text-16 font-medium ml-1">Back</Text>
        </Pressable>

        <Text className="text-white text-16 font-semibold flex-1 text-center mr-16">{title}</Text>
      </View>

      {/* Content */}
      <View className="flex-1">
        {error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text className="text-white text-18 font-semibold mt-4 text-center">Failed to Load Page</Text>
            <Text className="text-gray-400 text-14 mt-2 text-center">
              Please check your internet connection and try again.
            </Text>
            <Pressable
              onPress={handleRetry}
              className="bg-blue-500 px-6 py-3 rounded-lg mt-6"
              accessibilityRole="button"
              accessibilityLabel="Retry loading page"
            >
              <Text className="text-white text-16 font-medium">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <WebView
              ref={webViewRef}
              key={webviewKey}
              source={{ uri: url }}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              onHttpError={handleError}
              style={{ flex: 1 }}
              startInLoadingState={true}
              renderLoading={() => (
                <View className="flex-1 items-center justify-center bg-black">
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text className="text-gray-400 text-14 mt-4">Loading...</Text>
                </View>
              )}
              // Security navigation controls
              onShouldStartLoadWithRequest={Platform.OS === "ios" ? handleShouldStartLoadWithRequest : undefined}
              onNavigationStateChange={Platform.OS === "android" ? handleNavigationStateChange : undefined}
              // Security and privacy settings
              javaScriptEnabled={true}
              domStorageEnabled={false}
              thirdPartyCookiesEnabled={false}
              sharedCookiesEnabled={false}
              // Styling
              backgroundColor="#000000"
              // User agent for better compatibility
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
            />

            {loading && (
              <View className="absolute inset-0 items-center justify-center bg-black bg-opacity-50">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-400 text-14 mt-4">Loading {title}...</Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default WebViewScreen;
