import React from "react";
import { View, Text, Pressable, ViewStyle, TextStyle, StyleProp, AccessibilityRole } from "react-native";
import { spacing, borderRadius, typography, shadows, currentTheme } from "../../design/tokens";

export interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "outlined" | "filled";
  padding?: keyof typeof spacing;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
}

export interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
}

export interface CardContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export interface CardFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Define compound component type
interface CardComponent extends React.FC<CardProps> {
  Header: React.FC<CardHeaderProps>;
  Content: React.FC<CardContentProps>;
  Footer: React.FC<CardFooterProps>;
}

const CardBase: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "4",
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
}) => {
  const isInteractive = !!onPress;

  // Get variant styles
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: currentTheme.colors.surface,
          borderWidth: 0,
          ...shadows.md,
        };
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: currentTheme.colors.border,
        };
      case "filled":
        return {
          backgroundColor: currentTheme.colors.surfaceVariant,
          borderWidth: 0,
        };
      default: // default
        return {
          backgroundColor: currentTheme.colors.surface,
          borderWidth: 1,
          borderColor: currentTheme.colors.borderLight,
        };
    }
  };

  const baseStyle: ViewStyle = {
    borderRadius: borderRadius.xl,
    padding: spacing[padding as keyof typeof spacing],
    opacity: disabled ? 0.6 : 1,
  };

  const containerStyle = [baseStyle, getVariantStyles(), style];

  if (isInteractive) {
    return (
      <Pressable
        style={({ pressed }) => [containerStyle, pressed && !disabled && { opacity: 0.8 }]}
        onPress={onPress}
        disabled={disabled}
        {...(accessibilityRole && { accessibilityRole })}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={containerStyle}
      {...(accessibilityRole && { accessibilityRole })}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint || "Card content"}
    >
      {children}
    </View>
  );
};

// Create the compound component
export const Card = CardBase as CardComponent;

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  style,
  titleStyle,
  subtitleStyle,
}) => {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: spacing[3],
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        {title && (
          <Text
            style={[
              {
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: currentTheme.colors.text,
                marginBottom: subtitle ? spacing[1] : 0,
              },
              titleStyle,
            ]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            style={[
              {
                fontSize: typography.fontSize.sm,
                color: currentTheme.colors.textSecondary,
                lineHeight: typography.lineHeight.snug * typography.fontSize.sm,
              },
              subtitleStyle,
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {action && <View style={{ marginLeft: spacing[3] }}>{action}</View>}
    </View>
  );
};

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return (
    <View
      style={[
        {
          marginBottom: spacing[3],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingTop: spacing[3],
          borderTopWidth: 1,
          borderTopColor: currentTheme.colors.borderLight,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

// Preset card components
export const ElevatedCard: React.FC<Omit<CardProps, "variant">> = (props) => <Card {...props} variant="elevated" />;

export const OutlinedCard: React.FC<Omit<CardProps, "variant">> = (props) => <Card {...props} variant="outlined" />;

export const FilledCard: React.FC<Omit<CardProps, "variant">> = (props) => <Card {...props} variant="filled" />;

// Compound component pattern
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;
