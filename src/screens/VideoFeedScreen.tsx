import React, { useEffect, useCallback } from "react";
import { View, Text } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import OptimizedVideoList from "../components/OptimizedVideoList";
import { withErrorBoundary } from "../components/ErrorBoundary";
import { ErrorState } from "../components/ErrorState";
import LoadingSpinner from "../components/LoadingSpinner";
import { useScreenStatus } from "../hooks/useScreenStatus";
import { createScreenValidator } from "../utils/screenValidation";
import { useDataIntegrityMonitor } from "../hooks/useDataIntegrityMonitor";

function VideoFeedScreen() {
  const navigation = useNavigation();
  const [error, setError] = React.useState<string | null>(null);
  const validator = createScreenValidator('VideoFeedScreen');

  // Monitor data integrity for key uniqueness issues
  const { totalConfessions, videoConfessions } = useDataIntegrityMonitor();

  // Handle navigation focus for cleanup
  useFocusEffect(
    React.useCallback(() => {
      validator.log('Screen focused');
      setError(null); // Clear any previous errors on focus

      return () => {
        // Cleanup when navigating away
        validator.log('Navigating away');
      };
    }, [validator])
  );

  // Show error state if there's an error
  if (error) {
    return (
      <View className="flex-1 bg-black">
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null);
          }}
          type="video"
        />
      </View>
    );
  }

  const handleClose = useCallback(() => {
    try {
      validator.log('Closing video feed');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        validator.warn('Cannot go back, navigating to Home');
        (navigation as any).navigate('Home');
      }
    } catch (navError) {
      validator.error('Navigation failed:', navError);
      // Force navigate to home as fallback
      (navigation as any).navigate('Home');
    }
  }, [navigation, validator]);

  const handleError = useCallback((err: any) => {
    const errorMessage = err instanceof Error ? err.message : 'Failed to load videos';
    validator.error('Video list error:', err);
    setError(errorMessage);
  }, [validator]);

  // Render the video list directly - it handles its own loading state
  return (
    <View className="flex-1 bg-black">
      <OptimizedVideoList
        onClose={handleClose}
        onError={handleError}
      />
    </View>
  );
}

export default withErrorBoundary(VideoFeedScreen);
