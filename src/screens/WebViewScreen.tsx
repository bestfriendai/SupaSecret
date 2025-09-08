/**
 * WebView Screen for displaying privacy policy, terms of service, and help content
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  WebView: {
    url: string;
    title: string;
  };
};

type WebViewScreenRouteProp = RouteProp<RootStackParamList, 'WebView'>;
type WebViewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WebView'>;

const WebViewScreen: React.FC = () => {
  const navigation = useNavigation<WebViewScreenNavigationProp>();
  const route = useRoute<WebViewScreenRouteProp>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { url, title } = route.params;

  const handleError = () => {
    setError(true);
    setLoading(false);
    Alert.alert(
      'Error Loading Page',
      'Unable to load the requested page. Please check your internet connection and try again.',
      [
        { text: 'Retry', onPress: () => {
          setError(false);
          setLoading(true);
        }},
        { text: 'Close', onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
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
        
        <Text className="text-white text-16 font-semibold flex-1 text-center mr-16">
          {title}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1">
        {error ? (
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text className="text-white text-18 font-semibold mt-4 text-center">
              Failed to Load Page
            </Text>
            <Text className="text-gray-400 text-14 mt-2 text-center">
              Please check your internet connection and try again.
            </Text>
            <Pressable
              onPress={() => {
                setError(false);
                setLoading(true);
              }}
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
