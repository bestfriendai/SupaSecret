import React from "react";
import { Pressable, Text, ActivityIndicator, View } from "react-native";
import type { PressableProps } from "react-native";
import { cn } from "../../../utils/cn";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  textClassName?: string;
}

export const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      textClassName,
      ...pressableProps
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    // Base styles
    const baseStyles = "flex-row items-center justify-center rounded-lg active:opacity-80";

    // Variant styles
    const variantStyles = {
      primary: "bg-blue-500 active:bg-blue-600",
      secondary: "bg-purple-500 active:bg-purple-600",
      outline: "bg-transparent border border-blue-500 active:bg-blue-500/10",
      ghost: "bg-transparent active:bg-gray-800",
      danger: "bg-red-500 active:bg-red-600",
      success: "bg-green-500 active:bg-green-600",
    };

    // Size styles
    const sizeStyles = {
      sm: "px-3 py-2 min-h-[36px]",
      md: "px-4 py-3 min-h-[44px]",
      lg: "px-6 py-4 min-h-[52px]",
    };

    // Text size styles
    const textSizeStyles = {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    };

    // Text color styles
    const textColorStyles = {
      primary: "text-white",
      secondary: "text-white",
      outline: "text-blue-500",
      ghost: "text-blue-500",
      danger: "text-white",
      success: "text-white",
    };

    const containerClassName = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      fullWidth && "w-full",
      isDisabled && "opacity-60",
      className,
    );

    const textClass = cn("font-medium text-center", textSizeStyles[size], textColorStyles[variant], textClassName);

    const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;

    return (
      <Pressable
        ref={ref}
        className={containerClassName}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        {...pressableProps}
      >
        {loading && (
          <ActivityIndicator
            size="small"
            color={variant === "outline" || variant === "ghost" ? "#3B82F6" : "#FFFFFF"}
            className="mr-2"
          />
        )}

        {!loading && leftIcon && <View className="mr-2">{leftIcon}</View>}

        {typeof children === "string" ? <Text className={textClass}>{children}</Text> : children}

        {!loading && rightIcon && <View className="ml-2">{rightIcon}</View>}
      </Pressable>
    );
  },
);

Button.displayName = "Button";

// Preset button components
export const PrimaryButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="primary" />;

export const SecondaryButton: React.FC<Omit<ButtonProps, "variant">> = (props) => (
  <Button {...props} variant="secondary" />
);

export const OutlineButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="outline" />;

export const GhostButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="ghost" />;

export const DangerButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="danger" />;

export const SuccessButton: React.FC<Omit<ButtonProps, "variant">> = (props) => <Button {...props} variant="success" />;
