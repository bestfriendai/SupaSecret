import { useState, useEffect } from "react";
import { AccessibilityInfo, PixelRatio } from "react-native";

export interface DynamicTypeSettings {
  fontScale: number;
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
  "2xl": number;
  "3xl": number;
  "4xl": number;
  "5xl": number;
}

// Base font sizes (in points)
const BASE_FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
};

/**
 * Hook for supporting dynamic type and accessibility preferences
 * Automatically scales fonts and adjusts UI based on user preferences
 */
export const useDynamicType = () => {
  const [settings, setSettings] = useState<DynamicTypeSettings>({
    fontScale: PixelRatio.getFontScale(),
    isBoldTextEnabled: false,
    isReduceMotionEnabled: false,
    isScreenReaderEnabled: false,
  });

  useEffect(() => {
    const loadAccessibilitySettings = async () => {
      try {
        const [isBoldTextEnabled, isReduceMotionEnabled, isScreenReaderEnabled] = await Promise.all([
          // Feature-detect accessibility APIs before calling
          AccessibilityInfo.isBoldTextEnabled?.() ?? Promise.resolve(false),
          AccessibilityInfo.isReduceMotionEnabled?.() ?? Promise.resolve(false),
          AccessibilityInfo.isScreenReaderEnabled?.() ?? Promise.resolve(false),
        ]);

        setSettings((prev) => ({
          ...prev,
          isBoldTextEnabled,
          isReduceMotionEnabled,
          isScreenReaderEnabled,
        }));
      } catch (error) {
        if (__DEV__) {
          console.warn("Failed to load accessibility settings:", error);
        }
      }
    };

    loadAccessibilitySettings();

    // Listen for changes in accessibility settings
    const subscriptions = [
      AccessibilityInfo.addEventListener("reduceMotionChanged", (isReduceMotionEnabled) => {
        setSettings((prev) => ({ ...prev, isReduceMotionEnabled }));
      }),
      AccessibilityInfo.addEventListener("screenReaderChanged", (isScreenReaderEnabled) => {
        setSettings((prev) => ({ ...prev, isScreenReaderEnabled }));
      }),
      AccessibilityInfo.addEventListener("boldTextChanged", (isBoldTextEnabled) => {
        setSettings((prev) => ({ ...prev, isBoldTextEnabled }));
      }),
    ].filter(Boolean);

    return () => {
      subscriptions.forEach((subscription) => subscription?.remove());
    };
  }, []);

  // Calculate scaled font sizes based on user preferences
  const getScaledFontSizes = (): ScaledFontSizes => {
    const scale = settings.fontScale;
    const finalScale = scale;

    return Object.entries(BASE_FONT_SIZES).reduce((acc, [key, size]) => {
      acc[key as keyof ScaledFontSizes] = Math.round(size * finalScale);
      return acc;
    }, {} as ScaledFontSizes);
  };

  // Get font weight based on bold text preference
  const getFontWeight = (baseWeight: string = "normal"): string => {
    if (settings.isBoldTextEnabled) {
      switch (baseWeight) {
        case "normal":
        case "400":
          return "600";
        case "medium":
        case "500":
          return "700";
        case "semibold":
        case "600":
          return "700";
        case "bold":
        case "700":
          return "800";
        default:
          return "bold";
      }
    }
    return baseWeight;
  };

  // Get animation duration based on reduce motion preference
  const getAnimationDuration = (baseDuration: number): number => {
    return settings.isReduceMotionEnabled ? 0 : baseDuration;
  };

  // Get spacing scale based on font scale
  const getSpacingScale = (): number => {
    return settings.fontScale > 1.2 ? 1.15 : 1;
  };

  // Check if text should be larger for better readability
  const shouldUseLargerText = (): boolean => {
    return settings.fontScale > 1.3;
  };

  // Get minimum touch target size (44pt recommended by Apple/Google)
  const getMinTouchTargetSize = (): number => {
    const baseSize = 44;
    return settings.fontScale > 1.2 ? baseSize * 1.2 : baseSize;
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
    const baseRatio = isLargeText ? 1.6 : 1.5;
    return Math.round(fontSize * baseRatio);
  },

  // Get accessible color contrast with WCAG compliance
  getAccessibleColor: (baseColor: string, backgroundColor: string, isHighContrast: boolean = false): string => {
    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
      // Remove # if present and convert to lowercase
      const cleanHex = hex.replace(/^#/, "").toLowerCase();

      // Check for 3-digit or 6-digit hex format
      const shortHexRegex = /^([a-f\d])([a-f\d])([a-f\d])$/;
      const longHexRegex = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/;

      let result = longHexRegex.exec(cleanHex);

      if (!result) {
        // Try 3-digit format and expand to 6-digit
        const shortResult = shortHexRegex.exec(cleanHex);
        if (shortResult) {
          // Expand 3-digit to 6-digit (e.g., "abc" -> "aabbcc")
          const expandedHex =
            shortResult[1] + shortResult[1] + shortResult[2] + shortResult[2] + shortResult[3] + shortResult[3];
          result = longHexRegex.exec(expandedHex);
        }
      }

      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    };

    // Calculate relative luminance
    const getLuminance = (r: number, g: number, b: number): number => {
      const [rs, gs, bs] = [r, g, b].map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    // Calculate contrast ratio
    const getContrastRatio = (lum1: number, lum2: number): number => {
      const brightest = Math.max(lum1, lum2);
      const darkest = Math.min(lum1, lum2);
      return (brightest + 0.05) / (darkest + 0.05);
    };

    try {
      const baseRgb = hexToRgb(baseColor);
      const bgRgb = hexToRgb(backgroundColor);

      if (!baseRgb || !bgRgb) {
        // Fallback for invalid colors
        return isHighContrast ? "#000000" : baseColor;
      }

      const baseLum = getLuminance(baseRgb.r, baseRgb.g, baseRgb.b);
      const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      const contrast = getContrastRatio(baseLum, bgLum);

      // WCAG AA requires 4.5:1 for normal text, 7:1 for AAA
      const requiredContrast = isHighContrast ? 7 : 4.5;

      if (contrast >= requiredContrast) {
        return baseColor;
      }

      // If contrast is insufficient, return black or white based on background
      return bgLum > 0.5 ? "#000000" : "#FFFFFF";
    } catch (error) {
      // Fallback on error
      return isHighContrast ? "#000000" : baseColor;
    }
  },
};
