/**
 * Accessibility utilities for consistent a11y implementation
 * Provides standardized accessibility props and helpers
 */

import { AccessibilityRole, AccessibilityState, AccessibilityProps, AccessibilityInfo } from "react-native";

export interface A11yProps extends AccessibilityProps {
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
}

/**
 * Common accessibility roles for different UI elements
 */
export const A11Y_ROLES = {
  button: "button" as const,
  link: "link" as const,
  text: "text" as const,
  image: "image" as const,
  imagebutton: "imagebutton" as const,
  header: "header" as const,
  search: "search" as const,
  tab: "tab" as const,
  tablist: "tablist" as const,
  menu: "menu" as const,
  menuitem: "menuitem" as const,
  switch: "switch" as const,
  checkbox: "checkbox" as const,
  radio: "radio" as const,
  slider: "slider" as const,
  progressbar: "progressbar" as const,
  alert: "alert" as const,
  combobox: "combobox" as const,
  list: "list" as const,
  listitem: "listitem" as const,
} as const;

/**
 * Generate accessibility props for buttons
 */
export const getButtonA11yProps = (label: string, hint?: string, disabled = false, pressed = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityState: {
    disabled,
    selected: pressed,
  },
});

/**
 * Generate accessibility props for like/heart buttons
 */
export const getLikeButtonA11yProps = (isLiked: boolean, likeCount: number, disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: isLiked ? `Unlike. ${likeCount} likes` : `Like. ${likeCount} likes`,
  accessibilityHint: isLiked ? "Double tap to unlike this post" : "Double tap to like this post",
  accessibilityState: {
    disabled,
    selected: isLiked,
  },
});

/**
 * Generate accessibility props for bookmark/save buttons
 */
export const getBookmarkButtonA11yProps = (isSaved: boolean, disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: isSaved ? "Remove from saved" : "Save post",
  accessibilityHint: isSaved ? "Double tap to remove from saved posts" : "Double tap to save this post",
  accessibilityState: {
    disabled,
    selected: isSaved,
  },
});

/**
 * Generate accessibility props for share buttons
 */
export const getShareButtonA11yProps = (disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: "Share post",
  accessibilityHint: "Double tap to share this post",
  accessibilityState: { disabled },
});

/**
 * Generate accessibility props for report buttons
 */
export const getReportButtonA11yProps = (disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: "Report post",
  accessibilityHint: "Double tap to report this post",
  accessibilityState: { disabled },
});

/**
 * Generate accessibility props for navigation buttons
 */
export const getNavButtonA11yProps = (destination: string, disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: `Navigate to ${destination}`,
  accessibilityHint: `Double tap to go to ${destination}`,
  accessibilityState: { disabled },
});

/**
 * Generate accessibility props for back buttons
 */
export const getBackButtonA11yProps = (disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: "Go back",
  accessibilityHint: "Double tap to go back to previous screen",
  accessibilityState: { disabled },
});

/**
 * Generate accessibility props for close/dismiss buttons
 */
export const getCloseButtonA11yProps = (disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: "Close",
  accessibilityHint: "Double tap to close",
  accessibilityState: { disabled },
});

/**
 * Generate accessibility props for menu/more options buttons
 */
export const getMenuButtonA11yProps = (disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.button,
  accessibilityLabel: "More options",
  accessibilityHint: "Double tap to open menu with more options",
  accessibilityState: { disabled },
});

/**
 * Generate accessibility props for text inputs
 */
export const getTextInputA11yProps = (
  label: string,
  hint?: string,
  required = false,
  multiline = false,
): A11yProps => ({
  accessibilityRole: multiline ? "none" : "text",
  accessibilityLabel: label,
  accessibilityHint: hint,
});

/**
 * Generate accessibility props for search inputs
 */
export const getSearchInputA11yProps = (placeholder = "Search", hint?: string): A11yProps => ({
  accessibilityRole: A11Y_ROLES.search,
  accessibilityLabel: placeholder,
  accessibilityHint: hint || "Enter text to search",
});

/**
 * Generate accessibility props for switches/toggles
 */
export const getSwitchA11yProps = (label: string, isOn: boolean, disabled = false): A11yProps => ({
  accessibilityRole: A11Y_ROLES.switch,
  accessibilityLabel: label,
  accessibilityState: {
    disabled,
    checked: isOn,
  },
  accessibilityValue: {
    text: isOn ? "On" : "Off",
  },
});

/**
 * Generate accessibility props for tab buttons
 */
export const getTabA11yProps = (
  label: string,
  isSelected: boolean,
  tabIndex: number,
  totalTabs: number,
): A11yProps => ({
  accessibilityRole: A11Y_ROLES.tab,
  accessibilityLabel: label,
  accessibilityState: {
    selected: isSelected,
  },
  accessibilityHint: `Tab ${tabIndex + 1} of ${totalTabs}. Double tap to select.`,
});

/**
 * Generate accessibility props for progress indicators
 */
export const getProgressA11yProps = (label: string, current: number, max: number): A11yProps => ({
  accessibilityRole: A11Y_ROLES.progressbar,
  accessibilityLabel: label,
  accessibilityValue: {
    min: 0,
    max,
    now: current,
    text: max > 0 ? `${Math.round((current / max) * 100)}% complete` : "0% complete",
  },
});

/**
 * Generate accessibility props for alerts/notifications
 */
export const getAlertA11yProps = (
  message: string,
  type: "info" | "warning" | "error" | "success" = "info",
): A11yProps => ({
  accessibilityRole: A11Y_ROLES.alert,
  accessibilityLabel: `${type}: ${message}`,
  accessibilityLiveRegion: "polite",
});

/**
 * Generate accessibility props for lists
 */
export const getListA11yProps = (label: string, itemCount: number): A11yProps => ({
  accessibilityRole: A11Y_ROLES.list,
  accessibilityLabel: `${label}, ${itemCount} items`,
});

/**
 * Generate accessibility props for list items
 */
export const getListItemA11yProps = (label: string, index: number, total: number): A11yProps => ({
  accessibilityRole: "none",
  accessibilityLabel: `${label}, item ${index + 1} of ${total}`,
});

/**
 * Utility to combine multiple accessibility props
 */
export const combineA11yProps = (...props: (A11yProps | undefined)[]): A11yProps => {
  const validProps = props.filter((p): p is A11yProps => !!p);
  return validProps.reduce((combined, current) => {
    return {
      ...combined,
      ...current,
      accessibilityState: {
        ...combined.accessibilityState,
        ...current.accessibilityState,
      },
      accessibilityValue: {
        ...combined.accessibilityValue,
        ...current.accessibilityValue,
      },
    };
  }, {} as A11yProps);
};

// Enhanced accessibility functions for screen reader support
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
};

export const isReduceMotionEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
};

export const announceForAccessibility = async (message: string): Promise<void> => {
  try {
    await AccessibilityInfo.announceForAccessibility(message);
  } catch (error) {
    console.error("Failed to announce for accessibility:", error);
  }
};

export const setAccessibilityFocus = async (reactTag: number): Promise<void> => {
  try {
    await AccessibilityInfo.setAccessibilityFocus(reactTag);
  } catch (error) {
    console.error("Failed to set accessibility focus:", error);
  }
};

// Accessibility helpers for common patterns
export const AccessibilityHelpers = {
  formatCount: (count: number, singular: string, plural?: string): string => {
    const pluralForm = plural || `${singular}s`;
    return `${count} ${count === 1 ? singular : pluralForm}`;
  },

  formatTime: (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ${days === 1 ? "day" : "days"} ago`;
    if (hours > 0) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    if (minutes > 0) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    return "Just now";
  },

  getLoadingMessage: (context: string): string => {
    return `Loading ${context}, please wait`;
  },

  getErrorMessage: (error: string, context?: string): string => {
    return context ? `Error in ${context}: ${error}` : `Error: ${error}`;
  },

  getSuccessMessage: (action: string): string => {
    return `${action} completed successfully`;
  },
};
