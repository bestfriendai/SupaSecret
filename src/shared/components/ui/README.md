# UI Components Library

A comprehensive set of base UI components following the design system. Built with TypeScript, NativeWind v4, and React Native best practices.

## Components Overview

### Button

Flexible button component with multiple variants and sizes.

```tsx
import { Button, PrimaryButton, OutlineButton } from "@/shared/components/ui";

// Basic usage
<Button onPress={handlePress}>Click me</Button>

// With variants
<PrimaryButton onPress={handlePress}>Primary</PrimaryButton>
<OutlineButton onPress={handlePress}>Outline</OutlineButton>

// With icons
<Button
  leftIcon={<Icon name="star" />}
  rightIcon={<Icon name="arrow-right" />}
  loading={isLoading}
  disabled={isDisabled}
>
  Submit
</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

**Props:**
- `variant`: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success"
- `size`: "sm" | "md" | "lg"
- `loading`: boolean
- `disabled`: boolean
- `fullWidth`: boolean
- `leftIcon`, `rightIcon`: React.ReactNode

---

### Input

Advanced input component with validation, animations, and presets.

```tsx
import { Input, EmailInput, PasswordInput, SearchInput } from "@/shared/components/ui";

// Basic usage
<Input
  label="Username"
  value={username}
  onChangeText={setUsername}
  placeholder="Enter username"
/>

// With validation
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  error={errors.email}
  touched={touched.email}
  required
/>

// With character count
<Input
  label="Bio"
  value={bio}
  onChangeText={setBio}
  maxLength={150}
  showCharacterCount
  multiline
/>

// Preset inputs
<EmailInput label="Email" value={email} onChangeText={setEmail} />
<PasswordInput label="Password" value={password} onChangeText={setPassword} />
<SearchInput value={query} onChangeText={setQuery} />
```

**Props:**
- `label`: string
- `error`: string | null
- `helperText`: string
- `required`: boolean
- `maxLength`: number
- `showCharacterCount`: boolean
- `variant`: "default" | "outlined" | "filled"
- `size`: "sm" | "md" | "lg"
- `leftIcon`, `rightIcon`: React.ReactNode

---

### Card

Flexible card component with compound pattern for header, content, and footer.

```tsx
import { Card, ElevatedCard } from "@/shared/components/ui";

// Basic usage
<Card>
  <Text>Card content</Text>
</Card>

// Compound pattern
<Card variant="elevated">
  <Card.Header
    title="Card Title"
    subtitle="Card subtitle"
    action={<Button size="sm">Action</Button>}
  />
  <Card.Content>
    <Text>Main content goes here</Text>
  </Card.Content>
  <Card.Footer>
    <Button size="sm">Cancel</Button>
    <Button size="sm">Save</Button>
  </Card.Footer>
</Card>

// Interactive card
<Card onPress={handlePress}>
  <Text>Tap me</Text>
</Card>
```

**Props:**
- `variant`: "default" | "elevated" | "outlined" | "filled"
- `onPress`: () => void (makes card pressable)
- `disabled`: boolean

---

### Modal

Full-featured modal with animations and presets.

```tsx
import { Modal, AlertModal, ConfirmModal } from "@/shared/components/ui";

// Custom modal
<Modal
  visible={isVisible}
  onClose={handleClose}
  animationType="scale"
  size="md"
>
  <Text>Modal content</Text>
</Modal>

// Alert modal
<AlertModal
  visible={isVisible}
  onClose={handleClose}
  title="Success!"
  message="Your changes have been saved."
  onConfirm={handleConfirm}
/>

// Confirm modal
<ConfirmModal
  visible={isVisible}
  onClose={handleClose}
  title="Delete Item?"
  message="This action cannot be undone."
  onConfirm={handleDelete}
  destructive
/>
```

**Props:**
- `animationType`: "fade" | "slide" | "scale"
- `size`: "sm" | "md" | "lg" | "full"
- `position`: "center" | "bottom" | "top"
- `dismissOnBackdrop`: boolean
- `dismissOnBackButton`: boolean
- `backdropOpacity`: number

---

### Loading

Multiple loading indicators with animations.

```tsx
import { Loading, LoadingSpinner, LoadingDots, Skeleton } from "@/shared/components/ui";

// Basic loading
<Loading message="Loading..." />

// Variants
<Loading variant="spinner" size="lg" />
<LoadingSpinner color="#3B82F6" />
<LoadingDots size="md" />

// Skeleton loading
<Skeleton width="100%" height={20} />
<Skeleton width={100} height={100} borderRadius={50} />

// Full screen overlay
<LoadingOverlay visible={isLoading} message="Please wait..." />
```

**Props:**
- `variant`: "spinner" | "dots" | "pulse"
- `size`: "sm" | "md" | "lg"
- `message`: string
- `color`: string
- `fullScreen`: boolean

---

### Error

Comprehensive error handling components.

```tsx
import { Error, NetworkError, InlineError, ErrorBanner } from "@/shared/components/ui";

// Full error display
<Error
  title="Something went wrong"
  message="We couldn't load your data."
  onRetry={handleRetry}
  showDetails
  error={error}
/>

// Preset errors
<NetworkError onRetry={handleRetry} />
<ServerError message="Custom server error message" />

// Inline error
<InlineError message="Invalid email address" />

// Error banner
<ErrorBanner
  message="Connection lost. Some features may not work."
  onDismiss={handleDismiss}
/>
```

**Props:**
- `title`: string
- `message`: string
- `error`: Error | null
- `onRetry`: () => void
- `showDetails`: boolean
- `variant`: "default" | "minimal" | "full"

---

### Toast

Context-based toast notification system.

```tsx
import { ToastProvider, useToast } from "@/shared/components/ui";

// Wrap your app
<ToastProvider>
  <App />
</ToastProvider>

// In your components
function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success("Operation completed!");
  };

  const handleError = () => {
    toast.error("Something went wrong", "Error");
  };

  const handleCustom = () => {
    toast.show({
      type: "warning",
      message: "Please review your changes",
      duration: 5000,
      action: {
        label: "Review",
        onPress: handleReview,
      },
    });
  };
}

// Simple toast (without provider)
<SimpleToast
  visible={isVisible}
  message="Changes saved"
  type="success"
  onDismiss={handleDismiss}
/>
```

**Methods:**
- `toast.success(message, title?)`
- `toast.error(message, title?)`
- `toast.warning(message, title?)`
- `toast.info(message, title?)`
- `toast.show(config)`
- `toast.hide(id)`
- `toast.hideAll()`

---

### Header

Flexible header component with multiple variations.

```tsx
import { Header, SimpleHeader, TabbedHeader, SearchHeader } from "@/shared/components/ui";

// Full-featured header
<Header
  title="Screen Title"
  subtitle="Screen subtitle"
  leftAction={{
    icon: <Icon name="back" />,
    onPress: handleBack,
  }}
  rightAction={{
    icon: <Icon name="settings" />,
    onPress: handleSettings,
  }}
/>

// Simple header
<SimpleHeader title="Profile" onBack={handleBack} />

// Tabbed header
<TabbedHeader
  title="Messages"
  tabs={[
    { label: "All", value: "all" },
    { label: "Unread", value: "unread" },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>

// Search header
<SearchHeader
  value={query}
  onChangeText={setQuery}
  onBack={handleBack}
  placeholder="Search messages..."
/>
```

**Props:**
- `title`: string
- `subtitle`: string
- `variant`: "default" | "transparent" | "gradient"
- `size`: "sm" | "md" | "lg"
- `centerTitle`: boolean
- `showBorder`: boolean
- `leftAction`, `rightAction`: { icon, onPress, accessibilityLabel }

---

## Design Tokens

All components use consistent design tokens from `@/design/tokens`:

- **Colors**: Primary, secondary, semantic colors (success, error, warning)
- **Typography**: Font sizes, weights, line heights
- **Spacing**: Consistent spacing scale (4px base)
- **Border Radius**: sm, md, lg, xl, 2xl, 3xl, full
- **Shadows**: sm, base, md, lg, xl
- **Animation**: Duration and easing presets

## Best Practices

1. **Accessibility**: All components include proper accessibility props
2. **TypeScript**: Full type safety with exported prop types
3. **Performance**: Optimized with React.memo where appropriate
4. **Animations**: Smooth animations with react-native-reanimated
5. **Responsive**: Works on all screen sizes
6. **Dark Mode**: Designed for dark theme by default
7. **Customization**: Extensive props for customization
8. **Composition**: Use compound components for complex UIs

## Styling

Components use NativeWind v4 for styling:

```tsx
// Extend with className
<Button className="mt-4 mx-2">Custom spacing</Button>

// Override specific styles
<Card className="bg-blue-900">Custom background</Card>

// Combine with style prop for dynamic values
<Loading color={theme.primary} />
```

## Examples

### Form Example

```tsx
<Card>
  <Card.Header title="Sign In" />
  <Card.Content>
    <EmailInput
      label="Email"
      value={email}
      onChangeText={setEmail}
      error={errors.email}
      touched={touched.email}
      required
    />
    <PasswordInput
      label="Password"
      value={password}
      onChangeText={setPassword}
      error={errors.password}
      touched={touched.password}
      required
    />
  </Card.Content>
  <Card.Footer>
    <Button fullWidth loading={isLoading} onPress={handleSubmit}>
      Sign In
    </Button>
  </Card.Footer>
</Card>
```

### Error Handling Example

```tsx
function DataScreen() {
  const { data, error, isLoading, refetch } = useQuery();

  if (isLoading) {
    return <Loading message="Loading data..." fullScreen />;
  }

  if (error) {
    return (
      <Error
        title="Failed to load data"
        message="Please check your connection and try again."
        onRetry={refetch}
        error={error}
        showDetails={__DEV__}
      />
    );
  }

  return <DataList data={data} />;
}
```

### Toast Integration Example

```tsx
function FormScreen() {
  const toast = useToast();

  const handleSubmit = async () => {
    try {
      await submitForm(data);
      toast.success("Form submitted successfully!");
      navigation.goBack();
    } catch (error) {
      toast.error("Failed to submit form", "Error");
    }
  };

  return (
    <View>
      {/* Form content */}
      <Button onPress={handleSubmit}>Submit</Button>
    </View>
  );
}
```

## Contributing

When adding new components:

1. Follow the existing patterns and conventions
2. Include TypeScript types for all props
3. Add accessibility props
4. Support className for custom styling
5. Include usage examples in this README
6. Export from index.ts

## License

MIT
