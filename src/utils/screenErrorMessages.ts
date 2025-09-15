import { StandardError } from './errorHandling';

// Screen-specific error message catalog
export const screenErrorMessages: Record<string, Record<string, { message: string; suggestion?: string }>> = {
  // HomeScreen error messages
  HomeScreen: {
    NETWORK_ERROR: {
      message: 'Unable to load confessions. Please check your connection.',
      suggestion: 'Pull down to refresh when you\'re back online.',
    },
    LOAD_FAILED: {
      message: 'Failed to load new content. Please try again.',
      suggestion: 'Pull down to refresh the feed.',
    },
    REFRESH_FAILED: {
      message: 'Could not refresh the feed at this time.',
      suggestion: 'Please try again in a moment.',
    },
    SAVE_FAILED: {
      message: 'Unable to save this confession.',
      suggestion: 'Please check your connection and try again.',
    },
    REPORT_FAILED: {
      message: 'Could not submit your report.',
      suggestion: 'Please try again or contact support if the issue persists.',
    },
    AUTH_ERROR: {
      message: 'Your session has expired.',
      suggestion: 'Please sign in again to continue.',
    },
  },

  // VideoFeedScreen error messages
  VideoFeedScreen: {
    NETWORK_ERROR: {
      message: 'Unable to load videos. Check your internet connection.',
      suggestion: 'Tap to retry when you\'re connected.',
    },
    LOAD_FAILED: {
      message: 'Failed to load the video feed.',
      suggestion: 'Try refreshing the page.',
    },
    VIDEO_PLAYBACK_ERROR: {
      message: 'This video cannot be played right now.',
      suggestion: 'Try another video or refresh the feed.',
    },
    STREAM_ERROR: {
      message: 'Video streaming interrupted.',
      suggestion: 'Check your connection and try again.',
    },
    NO_VIDEOS: {
      message: 'No videos available at the moment.',
      suggestion: 'Check back later for new content.',
    },
  },

  // VideoRecordScreen error messages
  VideoRecordScreen: {
    CAMERA_INIT_FAILED: {
      message: 'Unable to start the camera.',
      suggestion: 'Please restart the app and try again.',
    },
    PERMISSION_DENIED: {
      message: 'Camera and microphone access required.',
      suggestion: 'Enable permissions in your device settings.',
    },
    RECORDING_FAILED: {
      message: 'Recording failed to start.',
      suggestion: 'Please check available storage and try again.',
    },
    PROCESSING_FAILED: {
      message: 'Video processing encountered an error.',
      suggestion: 'Please try recording again.',
    },
    UPLOAD_FAILED: {
      message: 'Unable to upload your video.',
      suggestion: 'Check your connection and try again.',
    },
    STORAGE_FULL: {
      message: 'Not enough storage space.',
      suggestion: 'Free up some space and try again.',
    },
    INVALID_DURATION: {
      message: 'Video must be between 3 and 60 seconds.',
      suggestion: 'Record a video within the time limit.',
    },
    FACE_BLUR_FAILED: {
      message: 'Face anonymization failed.',
      suggestion: 'Try recording again or skip anonymization.',
    },
    VOICE_CHANGE_FAILED: {
      message: 'Voice modulation failed.',
      suggestion: 'Try recording again or skip voice changes.',
    },
  },

  // Authentication-related screens
  SignInScreen: {
    INVALID_CREDENTIALS: {
      message: 'Invalid email or password.',
      suggestion: 'Please check your credentials and try again.',
    },
    NETWORK_ERROR: {
      message: 'Unable to sign in. Check your connection.',
      suggestion: 'Make sure you\'re connected to the internet.',
    },
    ACCOUNT_LOCKED: {
      message: 'Too many failed attempts.',
      suggestion: 'Please wait a few minutes and try again.',
    },
    EMAIL_NOT_VERIFIED: {
      message: 'Please verify your email first.',
      suggestion: 'Check your inbox for the verification link.',
    },
  },

  SignUpScreen: {
    EMAIL_EXISTS: {
      message: 'This email is already registered.',
      suggestion: 'Try signing in or use a different email.',
    },
    WEAK_PASSWORD: {
      message: 'Password is too weak.',
      suggestion: 'Use at least 8 characters with numbers and symbols.',
    },
    INVALID_EMAIL: {
      message: 'Please enter a valid email address.',
      suggestion: 'Check the email format and try again.',
    },
    SIGNUP_FAILED: {
      message: 'Unable to create your account.',
      suggestion: 'Please try again or contact support.',
    },
  },

  // Profile and Settings
  ProfileScreen: {
    UPDATE_FAILED: {
      message: 'Could not update your profile.',
      suggestion: 'Please check your connection and try again.',
    },
    IMAGE_UPLOAD_FAILED: {
      message: 'Failed to upload profile picture.',
      suggestion: 'Try a different image or check your connection.',
    },
    LOAD_PROFILE_FAILED: {
      message: 'Unable to load profile information.',
      suggestion: 'Pull down to refresh.',
    },
  },

  // Generic fallbacks for any screen
  _default: {
    NETWORK_ERROR: {
      message: 'Connection error. Please check your internet.',
      suggestion: 'Try again when you\'re back online.',
    },
    UNKNOWN_ERROR: {
      message: 'Something went wrong.',
      suggestion: 'Please try again.',
    },
    TIMEOUT: {
      message: 'The request took too long.',
      suggestion: 'Please check your connection and try again.',
    },
    SERVER_ERROR: {
      message: 'Our servers are having issues.',
      suggestion: 'Please try again in a few moments.',
    },
  },
};

// Helper function to get screen-specific message with fallback
export const getScreenErrorMessage = (
  error: StandardError,
  screenName: string
): { message: string; suggestion?: string } => {
  // Try to find screen-specific message
  const screenMessages = screenErrorMessages[screenName] || {};
  const errorConfig = screenMessages[error.code] || screenMessages[error.message];

  if (errorConfig) {
    return errorConfig;
  }

  // Try default messages
  const defaultMessages = screenErrorMessages._default;
  const defaultConfig = defaultMessages[error.code];

  if (defaultConfig) {
    return defaultConfig;
  }

  // Fallback to generic message
  return {
    message: error.message || 'An unexpected error occurred.',
    suggestion: 'Please try again.',
  };
};

// Recovery actions for specific error types
export const errorRecoveryActions: Record<string, () => void> = {
  AUTH_ERROR: () => {
    // Navigate to sign in screen
    // This would be injected from the navigation context
    console.log('Navigate to sign in');
  },
  PERMISSION_DENIED: () => {
    // Open app settings
    // This would use Linking.openSettings()
    console.log('Open settings');
  },
  NETWORK_ERROR: () => {
    // Show network troubleshooting tips
    console.log('Show network tips');
  },
};

// Error context helpers
export const addErrorContext = (
  error: StandardError,
  context: {
    screen?: string;
    action?: string;
    userId?: string;
    timestamp?: number;
  }
): StandardError => {
  return {
    ...error,
    details: {
      ...error.details,
      ...context,
      timestamp: context.timestamp || Date.now(),
    },
  };
};