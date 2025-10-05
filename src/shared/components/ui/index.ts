/**
 * UI Components Library
 *
 * A comprehensive set of base UI components following the design system.
 * Built with TypeScript, NativeWind v4, and React Native best practices.
 */

// Button Components
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  DangerButton,
  SuccessButton,
  type ButtonProps,
} from "./Button";

// Input Components
export { Input, EmailInput, PasswordInput, SearchInput, type InputProps } from "./Input";

// Card Components
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  ElevatedCard,
  OutlinedCard,
  FilledCard,
  type CardProps,
  type CardHeaderProps,
  type CardContentProps,
  type CardFooterProps,
} from "./Card";

// Modal Components
export {
  Modal,
  AlertModal,
  ConfirmModal,
  BottomSheetModal,
  type ModalProps,
  type AlertModalProps,
  type ConfirmModalProps,
} from "./Modal";

// Loading Components
export {
  Loading,
  LoadingSpinner,
  LoadingDots,
  LoadingPulse,
  Skeleton,
  LoadingOverlay,
  type LoadingProps,
  type LoadingOverlayProps,
  type SkeletonProps,
} from "./Loading";

// Error Components
export {
  Error,
  ErrorBoundaryFallback,
  NetworkError,
  NotFoundError,
  PermissionError,
  ServerError,
  InlineError,
  ErrorBanner,
  type ErrorProps,
  type ErrorBoundaryFallbackProps,
  type InlineErrorProps,
  type ErrorBannerProps,
} from "./Error";

// Toast Components
export {
  ToastProvider,
  useToast,
  SimpleToast,
  toast,
  type ToastConfig,
  type ToastType,
  type ToastPosition,
  type SimpleToastProps,
} from "./Toast";

// Header Components
export {
  Header,
  SimpleHeader,
  TabbedHeader,
  SearchHeader,
  type HeaderProps,
  type SimpleHeaderProps,
  type TabbedHeaderProps,
  type SearchHeaderProps,
} from "./Header";
