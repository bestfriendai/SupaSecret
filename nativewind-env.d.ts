/// <reference types="nativewind/types" />

import "react-native"

declare module "react-native" {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface RefreshControlProps {
    className?: string;
  }
  // Add more as needed for other components
}