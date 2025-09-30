# UI Components Implementation Guide

## Overview

This directory contains a comprehensive set of production-ready UI components built with:
- **TypeScript** - Full type safety
- **NativeWind v4** - Utility-first styling
- **React Native Reanimated** - Smooth 60fps animations
- **Accessibility** - WCAG compliant with proper ARIA labels
- **Design System** - Consistent tokens and patterns

## Component Architecture

### Design Principles

1. **Composition over Configuration** - Components are designed to be composed together
2. **Progressive Enhancement** - Start simple, add features as needed
3. **Accessibility First** - All components include proper accessibility props
4. **Type Safety** - Comprehensive TypeScript types for all props
5. **Performance** - Optimized with React.memo and efficient re-renders

### File Structure

```
ui/
├── Button.tsx          # Button with variants (primary, secondary, outline, ghost, danger, success)
├── Input.tsx           # Advanced input with validation and presets (Email, Password, Search)
├── Card.tsx            # Flexible card with compound pattern (Header, Content, Footer)
├── Modal.tsx           # Full-featured modal (Alert, Confirm, BottomSheet)
├── Loading.tsx         # Multiple loading indicators (Spinner, Dots, Pulse, Skeleton)
├── Error.tsx           # Comprehensive error handling (Network, Server, NotFound, etc.)
├── Toast.tsx           # Context-based notification system
├── Header.tsx          # Flexible header (Simple, Tabbed, Search)
├── index.ts            # Central export file
└── README.md           # Documentation and examples
```

## Component Details

### 1. Button Component

**Features:**
- 6 variants (primary, secondary, outline, ghost, danger, success)
- 3 sizes (sm, md, lg)
- Loading state with spinner
- Left/right icon support
- Full width option
- Disabled state
- Press feedback animation

**Usage Patterns:**
```tsx
// Basic
<Button onPress={handlePress}>Click me</Button>

// With loading
<Button loading={isSubmitting} disabled={!isValid}>Submit</Button>

// With icons
<Button leftIcon={<Icon name="save" />}>Save</Button>

// Full width
<Button fullWidth variant="primary">Continue</Button>
```

**Presets:**
- `PrimaryButton` - Blue background, white text
- `SecondaryButton` - Purple background, white text
- `OutlineButton` - Transparent with border
- `GhostButton` - Transparent, no border
- `DangerButton` - Red background for destructive actions
- `SuccessButton` - Green background for success actions

### 2. Input Component

**Features:**
- Animated focus states
- Error validation with animations
- Character count with color-coded warnings
- Helper text support
- Required field indicator
- Left/right icon slots
- 3 variants (default, outlined, filled)
- 3 sizes (sm, md, lg)

**Validation States:**
- Error state (red border, error message)
- Success state (green checkmark when valid)
- Focus state (blue border animation)
- Character limit warnings (yellow at 80%, red at 100%)

**Presets:**
- `EmailInput` - Email keyboard, no autocorrect
- `PasswordInput` - Toggle visibility with eye icon
- `SearchInput` - Search icon, filled variant

### 3. Card Component

**Features:**
- Compound component pattern
- 4 variants (default, elevated, outlined, filled)
- Pressable option for navigation
- Disabled state
- Shadow support

**Compound Pattern:**
```tsx
<Card>
  <Card.Header title="Title" subtitle="Subtitle" action={<Button />} />
  <Card.Content>{children}</Card.Content>
  <Card.Footer>{actions}</Card.Footer>
</Card>
```

### 4. Modal Component

**Features:**
- 3 animation types (fade, slide, scale)
- 4 sizes (sm, md, lg, full)
- 3 positions (center, bottom, top)
- Backdrop customization
- Dismiss on backdrop/back button
- Hardware back button support
- Keyboard handling

**Presets:**
- `AlertModal` - Single action confirmation
- `ConfirmModal` - Two-action confirmation with destructive option
- `BottomSheetModal` - Slides from bottom

### 5. Loading Component

**Features:**
- 3 variants (spinner, dots, pulse)
- 3 sizes (sm, md, lg)
- Custom colors
- Full screen option
- Message support

**Additional Components:**
- `LoadingSpinner` - Animated rotating spinner
- `LoadingDots` - Bouncing dots animation
- `LoadingPulse` - Pulsing circle
- `Skeleton` - Content placeholder
- `LoadingOverlay` - Full screen overlay

### 6. Error Component

**Features:**
- 3 variants (default, minimal, full)
- Retry functionality
- Error details toggle (dev mode)
- Custom icons
- Stack trace display

**Presets:**
- `NetworkError` - No internet connection
- `NotFoundError` - 404 errors
- `PermissionError` - Access denied
- `ServerError` - 500 errors
- `InlineError` - Small inline error message
- `ErrorBanner` - Top banner for global errors

### 7. Toast Component

**Features:**
- Context-based API
- 4 types (success, error, warning, info)
- Auto-dismiss with custom duration
- Action buttons
- Multiple toast queuing
- Position control (top, bottom)
- Slide animations

**API Methods:**
- `toast.success()` - Success notifications
- `toast.error()` - Error notifications
- `toast.warning()` - Warning notifications
- `toast.info()` - Info notifications
- `toast.show()` - Custom toast
- `toast.hide()` - Dismiss specific toast
- `toast.hideAll()` - Clear all toasts

### 8. Header Component

**Features:**
- Safe area handling
- Left/right action slots
- Multiple right actions support
- Title/subtitle
- Logo support
- Border toggle
- 3 variants (default, transparent, gradient)
- 3 sizes (sm, md, lg)
- Center title option

**Presets:**
- `SimpleHeader` - Basic header with back button
- `TabbedHeader` - Header with tabs
- `SearchHeader` - Header with search input

## Styling System

### NativeWind v4 Usage

All components use NativeWind's className prop:

```tsx
// Basic usage
<Button className="mt-4">Button</Button>

// Conditional classes
<Card className={cn("p-4", isActive && "bg-blue-500")}>

// Override styles
<Input className="mb-6" inputClassName="text-lg" />
```

### Design Tokens

Components reference consistent design tokens:

```tsx
import { colors, spacing, borderRadius, typography, shadows } from "@/design/tokens";
```

**Available Tokens:**
- `colors` - Primary, secondary, semantic, gray scale
- `spacing` - 0-96 scale (4px increments)
- `borderRadius` - sm to full
- `typography` - fontSize, fontWeight, lineHeight
- `shadows` - sm to xl elevation
- `animation` - duration and easing

## Accessibility

All components include:

1. **Proper Roles** - `accessibilityRole="button"`, etc.
2. **Labels** - `accessibilityLabel` for all interactive elements
3. **Hints** - `accessibilityHint` for context
4. **States** - `accessibilityState` for disabled, selected, etc.
5. **Touch Targets** - Minimum 44x44px (iOS guidelines)
6. **Screen Reader Support** - Semantic HTML and ARIA attributes
7. **Keyboard Navigation** - Full keyboard support

## Performance Optimization

1. **Reanimated** - 60fps animations on UI thread
2. **Memoization** - React.memo where appropriate
3. **Lazy Loading** - Components load on demand
4. **Optimized Re-renders** - Pure components and proper dependencies
5. **Native Driver** - Hardware-accelerated animations

## Testing

Each component should be tested for:

1. **Rendering** - Snapshot tests
2. **Interactions** - Press, focus, blur events
3. **Accessibility** - Screen reader compatibility
4. **Props** - All variants and sizes
5. **Edge Cases** - Long text, empty states, errors

## Integration Examples

### Form Integration

```tsx
import { Card, Input, EmailInput, PasswordInput, Button } from "@/shared/components/ui";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  return (
    <Card>
      <Card.Header title="Sign In" />
      <Card.Content>
        <EmailInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          required
        />
        <PasswordInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          required
        />
      </Card.Content>
      <Card.Footer>
        <Button fullWidth variant="primary" onPress={handleSubmit}>
          Sign In
        </Button>
      </Card.Footer>
    </Card>
  );
}
```

### List with Loading and Error States

```tsx
import { Loading, Error, Card } from "@/shared/components/ui";

function DataList() {
  const { data, error, isLoading, refetch } = useQuery();

  if (isLoading) {
    return <Loading message="Loading data..." fullScreen />;
  }

  if (error) {
    return (
      <Error
        title="Failed to load"
        message="Please try again"
        onRetry={refetch}
        error={error}
        showDetails={__DEV__}
      />
    );
  }

  return (
    <View>
      {data.map(item => (
        <Card key={item.id} onPress={() => navigate(item.id)}>
          <Text>{item.title}</Text>
        </Card>
      ))}
    </View>
  );
}
```

### Toast Notifications

```tsx
import { ToastProvider, useToast } from "@/shared/components/ui";

// Wrap app
function App() {
  return (
    <ToastProvider>
      <Navigation />
    </ToastProvider>
  );
}

// Use in components
function MyScreen() {
  const toast = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      toast.success("Saved successfully!");
    } catch (error) {
      toast.error("Failed to save", "Error");
    }
  };
}
```

## Customization

### Extending Components

```tsx
// Create custom button
export function IconButton({ icon, ...props }: ButtonProps & { icon: string }) {
  return (
    <Button
      {...props}
      leftIcon={<Icon name={icon} />}
      variant="ghost"
      size="sm"
    />
  );
}

// Create custom input
export function PhoneInput(props: InputProps) {
  return (
    <Input
      {...props}
      keyboardType="phone-pad"
      leftIcon={<Icon name="phone" />}
    />
  );
}
```

### Theme Customization

```tsx
// Override default colors
<Button
  className="bg-purple-600 active:bg-purple-700"
  textClassName="text-yellow-300"
>
  Custom Colors
</Button>

// Custom sizes
<Input
  className="py-6 px-8"
  inputClassName="text-2xl"
/>
```

## Migration Guide

### From Old Components

If migrating from existing components:

1. **Update imports:**
   ```tsx
   // Old
   import Button from "@/components/Button";

   // New
   import { Button } from "@/shared/components/ui";
   ```

2. **Update prop names:**
   ```tsx
   // Old
   <Button title="Click" type="primary" />

   // New
   <Button variant="primary">Click</Button>
   ```

3. **Update styling:**
   ```tsx
   // Old
   <Button style={{ marginTop: 16 }} />

   // New
   <Button className="mt-4" />
   ```

## Best Practices

1. **Use Presets** - Start with preset variants
2. **Composition** - Combine components for complex UIs
3. **Accessibility** - Always provide labels
4. **Loading States** - Show feedback for async operations
5. **Error Handling** - Display user-friendly error messages
6. **Validation** - Validate forms with proper error messages
7. **Responsive** - Test on different screen sizes
8. **Performance** - Use memo and callbacks appropriately
9. **Types** - Leverage TypeScript for type safety
10. **Consistency** - Use design tokens for consistency

## Troubleshooting

### Common Issues

1. **Styles not applying:**
   - Ensure NativeWind is configured correctly
   - Check tailwind.config.js content paths
   - Verify className prop support

2. **Animations not smooth:**
   - Make sure react-native-reanimated is installed
   - Check Babel configuration
   - Enable native driver

3. **Types not found:**
   - Check import paths
   - Verify TypeScript configuration
   - Restart TypeScript server

4. **Toast not showing:**
   - Ensure ToastProvider wraps your app
   - Check z-index conflicts
   - Verify safe area insets

## Contributing

When adding new components:

1. Follow existing patterns
2. Include TypeScript types
3. Add accessibility props
4. Support className customization
5. Add documentation
6. Include usage examples
7. Export from index.ts
8. Add tests

## Resources

- [NativeWind Documentation](https://www.nativewind.dev/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Navigation](https://reactnavigation.org/)
- [Accessibility Guidelines](https://reactnative.dev/docs/accessibility)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## License

MIT - See LICENSE file for details
