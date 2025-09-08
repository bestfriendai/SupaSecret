import { useState, useEffect } from 'react';
import { AccessibilityInfo, PixelRatio } from 'react-native';

export interface DynamicTypeSettings {
  fontScale: number;
  isLargeTextEnabled: boolean;
  isBoldTextEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isScreenReaderEnabled: boolean;
}

export interface ScaledFontSizes {
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
  '5xl': number;
}

// Base font sizes (in points)
const BASE_FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

/**
 * Hook for supporting dynamic type and accessibility preferences
 * Automatically scales fonts and adjusts UI based on user preferences
 */
export const useDynamicType = () => {
  const [settings, setSettings] = useState<DynamicTypeSettings>({
    fontScale: PixelRatio.getFontScale(),
    isLargeTextEnabled: false,
    isBoldTextEnabled: false,
    isReduceMotionEnabled: false,
    isScreenReaderEnabled: false,
  });

  useEffect(() => {
    const loadAccessibilitySettings = async () => {
      try {
        const [
          isLargeTextEnabled,
          isBoldTextEnabled,
          isReduceMotionEnabled,
          isScreenReaderEnabled,
        ] = await Promise.all([
          // Note: These APIs might not be available on all platforms
          // You may need to use platform-specific implementations
          Promise.resolve(false), // AccessibilityInfo.isLargeTextEnabled?.() || false,
          Promise.resolve(false), // AccessibilityInfo.isBoldTextEnabled?.() || false,
          AccessibilityInfo.isReduceMotionEnabled?.() || Promise.resolve(false),
          AccessibilityInfo.isScreenReaderEnabled(),
        ]);

        setSettings(prev => ({
          ...prev,
          isLargeTextEnabled,
          isBoldTextEnabled,
          isReduceMotionEnabled,
          isScreenReaderEnabled,
        }));
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to load accessibility settings:', error);
        }
      }
    };

    loadAccessibilitySettings();

    // Listen for changes in accessibility settings
    const subscriptions = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', (isReduceMotionEnabled) => {
        setSettings(prev => ({ ...prev, isReduceMotionEnabled }));
      }),
      AccessibilityInfo.addEventListener('screenReaderChanged', (isScreenReaderEnabled) => {
        setSettings(prev => ({ ...prev, isScreenReaderEnabled }));
      }),
    ];

    return () => {
      subscriptions.forEach(subscription => subscription?.remove());
    };
  }, []);

  // Calculate scaled font sizes based on user preferences
  const getScaledFontSizes = (): ScaledFontSizes => {
    const scale = settings.fontScale;
    const largeTextMultiplier = settings.isLargeTextEnabled ? 1.2 : 1;
    const finalScale = scale * largeTextMultiplier;

    return Object.entries(BASE_FONT_SIZES).reduce((acc, [key, size]) => {
      acc[key as keyof ScaledFontSizes] = Math.round(size * finalScale);
      return acc;
    }, {} as ScaledFontSizes);
  };

  // Get font weight based on bold text preference
  const getFontWeight = (baseWeight: string = 'normal'): string => {
    if (settings.isBoldTextEnabled) {
      switch (baseWeight) {
        case 'normal':
        case '400':
          return '600';
        case 'medium':
        case '500':
          return '700';
        case 'semibold':
        case '600':
          return '700';
        case 'bold':
        case '700':
          return '800';
        default:
          return 'bold';
      }
    }
    return baseWeight;
  };

  // Get animation duration based on reduce motion preference
  const getAnimationDuration = (baseDuration: number): number => {
    return settings.isReduceMotionEnabled ? 0 : baseDuration;
  };

  // Get spacing scale based on large text preference
  const getSpacingScale = (): number => {
    return settings.isLargeTextEnabled ? 1.15 : 1;
  };

  // Check if text should be larger for better readability
  const shouldUseLargerText = (): boolean => {
    return settings.fontScale > 1.3 || settings.isLargeTextEnabled;
  };

  // Get minimum touch target size (44pt recommended by Apple/Google)
  const getMinTouchTargetSize = (): number => {
    const baseSize = 44;
    return settings.isLargeTextEnabled ? baseSize * 1.2 : baseSize;
  };

  // Get contrast ratio adjustments
  const getContrastAdjustments = () => {
    return {
      // Increase contrast for better readability
      textOpacity: settings.isScreenReaderEnabled ? 1 : 0.9,
      borderOpacity: settings.isScreenReaderEnabled ? 1 : 0.8,
      backgroundOpacity: settings.isScreenReaderEnabled ? 1 : 0.95,
    };
  };

  return {
    settings,
    scaledFontSizes: getScaledFontSizes(),
    getFontWeight,
    getAnimationDuration,
    getSpacingScale,
    shouldUseLargerText,
    getMinTouchTargetSize,
    getContrastAdjustments,
  };
};

// Utility functions for responsive design
export const DynamicTypeUtils = {
  // Scale a value based on font scale
  scaleValue: (value: number, fontScale: number): number => {
    return Math.round(value * fontScale);
  },

  // Get responsive padding based on text size
  getResponsivePadding: (basePadding: number, fontScale: number): number => {
    const scale = Math.max(1, fontScale);
    return Math.round(basePadding * scale);
  },

  // Get responsive margin based on text size
  getResponsiveMargin: (baseMargin: number, fontScale: number): number => {
    const scale = Math.max(1, fontScale);
    return Math.round(baseMargin * scale);
  },

  // Calculate line height based on font size and accessibility needs
  getLineHeight: (fontSize: number, isLargeText: boolean = false): number => {
    const baseRatio = isLargeText ? 1.4 : 1.2;
    return Math.round(fontSize * baseRatio);
  },

  // Get accessible color contrast
  getAccessibleColor: (
    baseColor: string,
    backgroundColor: string,
    isHighContrast: boolean = false
  ): string => {
    // This is a simplified implementation
    // In a real app, you'd use a proper color contrast calculation library
    if (isHighContrast) {
      // Return high contrast version of the color
      return baseColor === '#FFFFFF' ? '#FFFFFF' : '#000000';
    }
    return baseColor;
  },
};
