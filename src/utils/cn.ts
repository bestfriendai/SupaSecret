import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Global spacing constants for consistent UI
export const SPACING = {
  // Base spacing units (following iOS 44px touch target guidelines)
  xs: 4, // 4px - minimal spacing
  sm: 8, // 8px - small spacing
  md: 12, // 12px - medium spacing
  lg: 16, // 16px - large spacing (p-4 equivalent)
  xl: 20, // 20px - extra large spacing
  xxl: 24, // 24px - section spacing (p-6 equivalent)

  // Touch target sizes (iOS accessibility guidelines)
  touchTarget: 44, // Minimum touch target size
  touchTargetLarge: 56, // Large touch target for primary actions

  // Component-specific spacing
  buttonPadding: 12, // Standard button padding
  sectionGap: 16, // Gap between sections (mb-4)
  cardPadding: 16, // Card internal padding
  screenPadding: 16, // Screen edge padding

  // Modal and overlay spacing
  modalPadding: 20, // Modal content padding
  overlayPadding: 24, // Overlay content padding
} as const;

// Color constants for consistent theming
export const COLORS = {
  primary: "#1D9BF0", // Primary blue accent
  background: "#000000", // Dark background
  surface: "#1A1A1A", // Card/surface background
  text: "#FFFFFF", // Primary text
  textSecondary: "#8B8B8B", // Secondary text
  border: "#333333", // Border color
  error: "#FF4444", // Error red
  warning: "#FFB800", // Warning yellow
  success: "#00C851", // Success green
} as const;

// Typography constants
export const TYPOGRAPHY = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// Animation constants
export const ANIMATIONS = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeOut: "ease-out",
    easeIn: "ease-in",
    easeInOut: "ease-in-out",
  },
} as const;
