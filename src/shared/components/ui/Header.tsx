import React from "react";
import { View, Text, Pressable, Platform, StatusBar } from "react-native";
import type { ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "../../../utils/cn";

export interface HeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  leftAction?: {
    icon: React.ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  rightAction?: {
    icon: React.ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
  };
  rightActions?: {
    icon: React.ReactNode;
    onPress: () => void;
    accessibilityLabel?: string;
  }[];
  showBorder?: boolean;
  variant?: "default" | "transparent" | "gradient";
  size?: "sm" | "md" | "lg";
  centerTitle?: boolean;
  logo?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  leftAction,
  rightAction,
  rightActions,
  showBorder = true,
  variant = "default",
  size = "md",
  centerTitle = false,
  logo,
  className,
  ...viewProps
}) => {
  const insets = useSafeAreaInsets();

  const variantStyles = {
    default: "bg-black",
    transparent: "bg-transparent",
    gradient: "bg-gradient-to-b from-black to-gray-900",
  };

  const sizeStyles = {
    sm: {
      padding: "py-2",
      title: "text-base",
      subtitle: "text-xs",
    },
    md: {
      padding: "py-3",
      title: "text-xl",
      subtitle: "text-sm",
    },
    lg: {
      padding: "py-4",
      title: "text-2xl",
      subtitle: "text-base",
    },
  };

  const styles = sizeStyles[size];

  return (
    <View style={{ paddingTop: insets.top }} className={cn(variantStyles[variant], className)} {...viewProps}>
      {/* Status Bar */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header Content */}
      <View
        className={cn(
          "flex-row items-center justify-between px-4",
          styles.padding,
          showBorder && "border-b border-gray-800/50",
        )}
      >
        {/* Left Section */}
        <View className="flex-row items-center min-w-[44px]">
          {leftAction && (
            <Pressable
              onPress={leftAction.onPress}
              className="w-11 h-11 items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={leftAction.accessibilityLabel || "Back"}
            >
              {leftAction.icon}
            </Pressable>
          )}
        </View>

        {/* Center Section */}
        <View className={cn("flex-1 mx-2", centerTitle ? "items-center" : "items-start")}>
          {logo ? (
            <View className="flex-row items-center">
              {logo}
              {title && <Text className={cn("text-white font-bold ml-2", styles.title)}>{title}</Text>}
            </View>
          ) : (
            <>
              <Text className={cn("text-white font-bold", styles.title)} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
              {subtitle && (
                <Text className={cn("text-gray-400", styles.subtitle)} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Right Section */}
        <View className="flex-row items-center min-w-[44px] justify-end">
          {rightActions ? (
            rightActions.map((action, index) => (
              <Pressable
                key={index}
                onPress={action.onPress}
                className="w-11 h-11 items-center justify-center ml-1 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel || `Action ${index + 1}`}
              >
                {action.icon}
              </Pressable>
            ))
          ) : rightAction ? (
            <Pressable
              onPress={rightAction.onPress}
              className="w-11 h-11 items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={rightAction.accessibilityLabel || "Action"}
            >
              {rightAction.icon}
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

// Simple Header Component
export interface SimpleHeaderProps extends ViewProps {
  title: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  title,
  onBack,
  showBackButton = true,
  className,
  ...viewProps
}) => {
  return (
    <Header
      title={title}
      leftAction={
        showBackButton && onBack
          ? {
              icon: <Text className="text-blue-500 text-2xl">←</Text>,
              onPress: onBack,
              accessibilityLabel: "Go back",
            }
          : undefined
      }
      className={className}
      {...viewProps}
    />
  );
};

// Tabbed Header Component
export interface TabbedHeaderProps extends ViewProps {
  title: string;
  tabs: {
    label: string;
    value: string;
  }[];
  activeTab: string;
  onTabChange: (value: string) => void;
  leftAction?: HeaderProps["leftAction"];
  rightAction?: HeaderProps["rightAction"];
}

export const TabbedHeader: React.FC<TabbedHeaderProps> = ({
  title,
  tabs,
  activeTab,
  onTabChange,
  leftAction,
  rightAction,
  className,
  ...viewProps
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className={cn("bg-black", className)} {...viewProps}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        {/* Left Section */}
        <View className="min-w-[44px]">
          {leftAction && (
            <Pressable
              onPress={leftAction.onPress}
              className="w-11 h-11 items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={leftAction.accessibilityLabel || "Back"}
            >
              {leftAction.icon}
            </Pressable>
          )}
        </View>

        {/* Title */}
        <Text className="text-white text-xl font-bold" accessibilityRole="header">
          {title}
        </Text>

        {/* Right Section */}
        <View className="min-w-[44px] items-end">
          {rightAction && (
            <Pressable
              onPress={rightAction.onPress}
              className="w-11 h-11 items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel={rightAction.accessibilityLabel || "Action"}
            >
              {rightAction.icon}
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 border-b border-gray-800">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => onTabChange(tab.value)}
              className={cn("px-4 py-3 mr-4", isActive && "border-b-2 border-blue-500")}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Text className={cn("font-medium", isActive ? "text-white" : "text-gray-400")}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// Search Header Component
export interface SearchHeaderProps extends ViewProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onBack?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
  rightAction?: HeaderProps["rightAction"];
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  placeholder = "Search...",
  value,
  onChangeText,
  onBack,
  onClear,
  autoFocus = false,
  rightAction,
  className,
  ...viewProps
}) => {
  const insets = useSafeAreaInsets();
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={{ paddingTop: insets.top }} className={cn("bg-black px-4 py-3", className)} {...viewProps}>
      <View className="flex-row items-center">
        {/* Back Button */}
        {onBack && (
          <Pressable
            onPress={onBack}
            className="w-11 h-11 items-center justify-center mr-2 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text className="text-blue-500 text-2xl">←</Text>
          </Pressable>
        )}

        {/* Search Input */}
        <View
          className={cn(
            "flex-1 flex-row items-center bg-gray-900 rounded-full px-4 py-2",
            isFocused && "border border-blue-500",
          )}
        >
          <Text className="text-gray-400 text-lg mr-2">🔍</Text>
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e: any) => onChangeText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoFocus={autoFocus}
            className="flex-1 text-white text-base bg-transparent outline-none"
            style={{ border: "none" }}
          />
          {value.length > 0 && onClear && (
            <Pressable
              onPress={onClear}
              className="w-6 h-6 items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Text className="text-gray-400 text-lg">✕</Text>
            </Pressable>
          )}
        </View>

        {/* Right Action */}
        {rightAction && (
          <Pressable
            onPress={rightAction.onPress}
            className="w-11 h-11 items-center justify-center ml-2 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel={rightAction.accessibilityLabel || "Action"}
          >
            {rightAction.icon}
          </Pressable>
        )}
      </View>
    </View>
  );
};
