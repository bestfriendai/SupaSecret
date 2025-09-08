/**
 * UI Component Library
 * Centralized export for all design system components
 */

// Button components
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  DangerButton,
} from './Button';

// Card components
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  ElevatedCard,
  OutlinedCard,
  FilledCard,
} from './Card';

// Enhanced Input components (already created)
export {
  EnhancedInput,
  EmailInput,
  PasswordInput,
  SearchInput,
} from '../EnhancedInput';

// Error State components (already created)
export {
  ErrorState,
  NetworkErrorState,
  EmptyState,
  GenericErrorState,
} from '../ErrorState';

// Re-export design tokens for easy access
export * from '../../design/tokens';

// Type definitions for the design system
export interface ComponentVariant {
  variant?: string;
  size?: string;
  disabled?: boolean;
}

export interface ComponentTheme {
  colors: Record<string, string>;
  spacing: Record<string, number>;
  typography: Record<string, any>;
  borderRadius: Record<string, number>;
  shadows: Record<string, any>;
}

// Design system utilities
export const DesignSystemUtils = {
  // Get component size styles with validation
  getComponentSize: (size: 'sm' | 'md' | 'lg', type: 'button' | 'input' | 'card') => {
    const sizeMap = {
      button: {
        sm: { height: 36, padding: 12 },
        md: { height: 44, padding: 16 },
        lg: { height: 52, padding: 20 },
      },
      input: {
        sm: { height: 36, padding: 12 },
        md: { height: 44, padding: 16 },
        lg: { height: 52, padding: 20 },
      },
      card: {
        sm: { padding: 12 },
        md: { padding: 16 },
        lg: { padding: 24 },
      },
    } as const;

    // Validate that the type exists
    if (!sizeMap.hasOwnProperty(type)) {
      throw new Error(`Invalid component type: ${type}. Valid types are: ${Object.keys(sizeMap).join(', ')}`);
    }

    const typeMap = sizeMap[type];

    // Validate that the size exists for this type
    if (!typeMap.hasOwnProperty(size)) {
      // Return the smallest size as default
      const defaultSize = 'sm';
      console.warn(`Invalid size '${size}' for type '${type}'. Using default size '${defaultSize}'.`);
      return typeMap[defaultSize];
    }

    return typeMap[size];
  },

  // Get semantic color
  getSemanticColor: (semantic: 'primary' | 'secondary' | 'success' | 'warning' | 'error', shade: number = 500) => {
    // This would integrate with your color tokens
    return `var(--color-${semantic}-${shade})`;
  },

  // Get responsive spacing
  getResponsiveSpacing: (base: number, scale: number = 1) => {
    return Math.round(base * scale);
  },
};
