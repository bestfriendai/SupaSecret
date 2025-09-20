import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import OptimizedTikTokVideoFeed from "../components/OptimizedTikTokVideoFeed";
import { withErrorBoundary } from "../components/ErrorBoundary";
import { createScreenValidator } from "../utils/screenValidation";
import type { RootStackParamList, TabParamList } from "../navigation/AppNavigator";

type VideoFeedNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Videos">,
  NativeStackNavigationProp<RootStackParamList>
>;

function VideoFeedScreen() {
  const navigation = useNavigation<VideoFeedNavigationProp>();
  const validator = useMemo(() => createScreenValidator("VideoFeedScreen"), []);

  useFocusEffect(
    useCallback(() => {
      validator.log("Video feed focused");

      return () => {
        validator.log("Video feed blurred");
      };
    }, [validator]),
  );

  const handleClose = useCallback(() => {
    validator.log("Closing video feed");

    const parentNav = navigation.getParent?.();
    if (parentNav?.canGoBack()) {
      parentNav.goBack();
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    validator.warn("Fallback navigation to MainTabs");
    navigation.navigate("MainTabs");
  }, [navigation, validator]);

  return (
    <View className="flex-1 bg-black">
      <OptimizedTikTokVideoFeed onClose={handleClose} />
    </View>
  );
}

export default withErrorBoundary(VideoFeedScreen);
