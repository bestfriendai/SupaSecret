import React from "react";
import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, typography, shadows } from "../../design/tokens";
import { getButtonA11yProps } from "../../utils/accessibility";

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  // Get variant styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case "primary":
        return {
          container: {
            backgroundColor: isDisabled ? colors.gray[600] : colors.primary[500],
            borderWidth: 0,
          },
          text: {
            color: colors.white,
          },
        };
      case "secondary":
        return {
          container: {
            backgroundColor: isDisabled ? colors.gray[700] : colors.secondary[500],
            borderWidth: 0,
          },
          text: {
            color: colors.white,
          },
        };
      case "outline":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: isDisabled ? colors.gray[600] : colors.primary[500],
          },
          text: {
            color: isDisabled ? colors.gray[500] : colors.primary[500],
          },
        };
      case "ghost":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 0,
          },
          text: {
            color: isDisabled ? colors.gray[500] : colors.primary[500],
          },
        };
      case "danger":
        return {
          container: {
            backgroundColor: isDisabled ? colors.gray[600] : colors.error[500],
            borderWidth: 0,
          },
          text: {
            color: colors.white,
          },
        };
      default:
        return {
          container: {
            backgroundColor: colors.primary[500],
            borderWidth: 0,
          },
          text: {
            color: colors.white,
          },
        };
    }
  };

  // Get size styles
  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case "sm":
        return {
          container: {
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            minHeight: 36,
          },
          text: {
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
          },
          iconSize: 16,
        };
      case "lg":
        return {
          container: {
            paddingHorizontal: spacing[6],
            paddingVertical: spacing[4],
            minHeight: 52,
          },
          text: {
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
          },
          iconSize: 24,
        };
      default: // md
        return {
          container: {
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            minHeight: 44,
          },
          text: {
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.medium,
          },
          iconSize: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const containerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.lg,
    opacity: isDisabled ? 0.6 : 1,
    width: fullWidth ? "100%" : undefined,
    ...shadows.sm,
    ...variantStyles.container,
    ...sizeStyles.container,
    ...style,
  };

  const textStyles: TextStyle = {
    textAlign: "center",
    ...variantStyles.text,
    ...sizeStyles.text,
    ...textStyle,
  };

  const iconColor = variantStyles.text.color;

  return (
    <Pressable
      style={({ pressed }) => [containerStyle, pressed && !isDisabled && { opacity: 0.8 }]}
      onPress={onPress}
      disabled={isDisabled}
      {...getButtonA11yProps(
        accessibilityLabel || (typeof children === "string" ? children : "Button"),
        accessibilityHint,
        isDisabled,
      )}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={iconColor}
          style={{ marginRight: leftIcon || children ? spacing[2] : 0 }}
        />
      )}

      {!loading && leftIcon && (
        <Ionicons name={leftIcon} size={sizeStyles.iconSize} color={iconColor} style={{ marginRight: spacing[2] }} />
      )}

      {typeof children === "string" ? <Text style={textStyles}>{children}</Text> : children}

      {!loading && rightIcon && (
        <Ionicons name={rightIcon} size={sizeStyles.iconSize} color={iconColor} style={{ marginLeft: spacing[2] }} />
      )}
    </Pressable>
  );
};

// Preset button components
export const PrimaryButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="primary" />;

export const SecondaryButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button {...props} variant="secondary" />
);

export const OutlineButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="outline" />;

export const GhostButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="ghost" />;

export const DangerButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="danger" />;
