import React from "react";
import { View, Text, Pressable } from "react-native";
import type { ViewProps, PressableProps, TextProps } from "react-native";
import { cn } from "../../../utils/cn";

export interface CardProps extends Omit<ViewProps, "children"> {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined" | "filled";
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface CardHeaderProps extends ViewProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
}

export interface CardContentProps extends ViewProps {
  children: React.ReactNode;
}

export interface CardFooterProps extends ViewProps {
  children: React.ReactNode;
}

// Main Card Component
const CardBase: React.FC<CardProps> = ({
  children,
  variant = "default",
  onPress,
  disabled = false,
  className,
  ...viewProps
}) => {
  const isInteractive = !!onPress;

  const baseStyles = "rounded-xl p-4";

  const variantStyles = {
    default: "bg-gray-900 border border-gray-800",
    elevated: "bg-gray-900 shadow-lg",
    outlined: "bg-transparent border border-gray-700",
    filled: "bg-gray-800",
  };

  const containerClassName = cn(baseStyles, variantStyles[variant], disabled && "opacity-60", className);

  if (isInteractive) {
    return (
      <Pressable
        className={cn(containerClassName, "active:opacity-80")}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...(viewProps as PressableProps)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={containerClassName} {...viewProps}>
      {children}
    </View>
  );
};

// Card Header Component
export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
  titleClassName,
  subtitleClassName,
  ...viewProps
}) => {
  return (
    <View className={cn("flex-row items-start justify-between mb-3", className)} {...viewProps}>
      <View className="flex-1">
        {title && (
          <Text
            className={cn("text-white text-lg font-semibold", subtitle && "mb-1", titleClassName)}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        {subtitle && <Text className={cn("text-gray-400 text-sm", subtitleClassName)}>{subtitle}</Text>}
      </View>
      {action && <View className="ml-3">{action}</View>}
    </View>
  );
};

// Card Content Component
export const CardContent: React.FC<CardContentProps> = ({ children, className, ...viewProps }) => {
  return (
    <View className={cn("mb-3", className)} {...viewProps}>
      {children}
    </View>
  );
};

// Card Footer Component
export const CardFooter: React.FC<CardFooterProps> = ({ children, className, ...viewProps }) => {
  return (
    <View className={cn("flex-row items-center justify-end pt-3 border-t border-gray-800", className)} {...viewProps}>
      {children}
    </View>
  );
};

// Compound Component Pattern
interface CardComponent extends React.FC<CardProps> {
  Header: typeof CardHeader;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
}

export const Card = CardBase as CardComponent;

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

// Preset card components
export const ElevatedCard: React.FC<Omit<CardProps, "variant">> = (props) => <Card {...props} variant="elevated" />;

export const OutlinedCard: React.FC<Omit<CardProps, "variant">> = (props) => <Card {...props} variant="outlined" />;

export const FilledCard: React.FC<Omit<CardProps, "variant">> = (props) => <Card {...props} variant="filled" />;
