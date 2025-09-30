# Authentication Feature

This directory contains the complete authentication feature for the application, following a clean feature-based architecture.

## Directory Structure

```
auth/
├── components/          # UI components specific to auth
│   ├── AuthButton.tsx   # Reusable auth button component
│   ├── AuthInput.tsx    # Reusable auth input component
│   └── AuthProvider.tsx # Auth provider for managing auth lifecycle
├── hooks/              # Custom hooks for auth
│   ├── useAuth.ts      # Main auth hook with all auth functionality
│   └── useProtectedRoute.ts # Hook for protected route navigation
├── services/           # Business logic and API calls
│   └── authService.ts  # All auth-related services and utilities
├── stores/             # State management
│   └── authStore.ts    # Zustand store for auth state
├── types/              # TypeScript types
│   └── auth.types.ts   # All auth-related types
├── index.ts            # Public API - exports all public interfaces
└── README.md           # This file
```

## Features

### 1. Authentication Service (`services/authService.ts`)

The auth service provides all authentication-related functionality:

- **User Management**
  - `signUpUser()` - Register new users
  - `signInUser()` - Authenticate existing users
  - `signOutUser()` - Sign out users
  - `getCurrentUser()` - Get current authenticated user
  - `updateUserData()` - Update user profile

- **Password Management**
  - `sendPasswordReset()` - Send password reset email
  - `validatePassword()` - Validate password strength
  - `getPasswordStrength()` - Get password strength indicator

- **Validation**
  - `validateEmail()` - Email validation
  - `sanitizeInput()` - XSS prevention
  - `isSessionValid()` - Session validation

### 2. Authentication Store (`stores/authStore.ts`)

Zustand-based state management with persistence:

```typescript
interface AuthStore {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;

  // Actions
  signUp: (data: SignUpData) => Promise<void>;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  setOnboarded: () => Promise<void>;
  clearError: () => void;
  checkAuthState: () => Promise<void>;
}
```

**Features:**
- Persists user data to AsyncStorage
- Only stores non-sensitive user data (no email)
- Auto-refreshes sessions
- Handles network errors gracefully
- Validates rehydrated state

### 3. Authentication Hooks (`hooks/`)

#### `useAuth()`
Main hook providing access to all auth functionality:

```typescript
const {
  user,
  isAuthenticated,
  isLoading,
  error,
  signUp,
  signIn,
  signOut,
  updateUser,
  setOnboarded,
  clearError,
  checkAuthState,
} = useAuth();
```

#### Specialized Hooks
- `useUser()` - Get just the current user
- `useIsAuthenticated()` - Check authentication status
- `useIsOnboarded()` - Check onboarding status
- `useAuthLoading()` - Get loading state
- `useSignUp()` - Sign-up specific functionality
- `useSignIn()` - Sign-in specific functionality
- `useSignOut()` - Sign-out specific functionality
- `useUpdateUser()` - Update user specific functionality

#### `useProtectedRoute()`
Handles protected route navigation based on auth state:

```typescript
useProtectedRoute(); // Call in your layout component
```

### 4. UI Components (`components/`)

#### `AuthInput`
Reusable input component with built-in features:
- Email/password input types
- Show/hide password toggle
- Error display
- Icon support
- Loading states

```typescript
<AuthInput
  label="Email Address"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  keyboardType="email-address"
  leftIcon="mail"
  error={error}
/>
```

#### `AuthButton`
Reusable button component:
- Multiple variants (primary, secondary, outline)
- Loading states
- Icon support
- Disabled states

```typescript
<AuthButton
  title="Sign In"
  onPress={handleSignIn}
  loading={isLoading}
  leftIcon="log-in"
/>
```

#### `AuthProvider`
Provider component that sets up auth listeners and manages auth lifecycle:

```typescript
<AuthProvider>
  <App />
</AuthProvider>
```

## Usage

### 1. Import from the feature

```typescript
import {
  useAuth,
  useProtectedRoute,
  AuthProvider,
  AuthButton,
  AuthInput,
} from "@/src/features/auth";
```

### 2. Set up authentication in your app

In your root layout:

```typescript
import { AuthProvider, useProtectedRoute } from "@/src/features/auth";

function RootLayoutContent() {
  useProtectedRoute(); // Handle route protection

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
```

### 3. Use auth in your screens

```typescript
import { useAuth } from "@/src/features/auth";

export default function SignInScreen() {
  const { signIn, isLoading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn({ email, password });
      // Navigation handled automatically
    } catch (error) {
      // Handle error
    }
  };

  return (
    // Your UI
  );
}
```

## Authentication Flow

### Sign Up Flow
1. User enters email, password, and optional username
2. Client validates input (email format, password strength)
3. `signUpUser()` creates account in Supabase
4. User profile created with username and onboarded status
5. User object returned and stored in auth store
6. User automatically signed in
7. Protected route redirects to main app

### Sign In Flow
1. User enters email and password
2. Client validates input
3. `signInUser()` authenticates with Supabase
4. Gets user profile data
5. Updates last login timestamp
6. User object stored in auth store
7. Protected route redirects to main app

### Session Management
- Sessions are stored securely using Expo SecureStore
- Auto-refresh enabled for seamless experience
- Session validation on app resume
- Graceful handling of expired sessions
- Network error resilience

### Protected Routes
- `useProtectedRoute()` hook manages navigation
- Redirects unauthenticated users to onboarding
- Redirects authenticated users to main app
- Handles onboarding status

## Security Features

1. **Password Requirements**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number

2. **Input Sanitization**
   - XSS prevention
   - JavaScript injection prevention
   - Event handler removal

3. **Secure Storage**
   - Sessions stored in Expo SecureStore
   - Email not persisted to storage
   - Only non-sensitive user data cached

4. **Session Management**
   - PKCE flow for enhanced security
   - Auto-refresh tokens
   - Session expiry validation
   - 5-minute buffer for time discrepancies

## Error Handling

The auth system provides detailed error codes:

- `INVALID_EMAIL` - Invalid email format
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `PASSWORD_MISMATCH` - Passwords don't match
- `USER_EXISTS` - Email already registered
- `INVALID_CREDENTIALS` - Wrong email/password
- `USER_NOT_FOUND` - No account with email
- `EMAIL_NOT_CONFIRMED` - Email not verified
- `TOO_MANY_REQUESTS` - Rate limited
- `NETWORK_ERROR` - Network connectivity issue
- `UNAUTHORIZED` - Not authorized for action
- `UPDATE_ERROR` - Failed to update user
- `SIGNUP_ERROR` - Failed to create account
- `SIGNIN_ERROR` - Failed to sign in
- `SIGNOUT_ERROR` - Failed to sign out

## Integration with Supabase

The auth feature integrates with Supabase:

```typescript
// Supabase client is configured in src/lib/supabase.ts
import { supabase } from "@/src/lib/supabase";

// Auth operations use Supabase Auth
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signUp({ email, password });
await supabase.auth.signOut();

// User profiles stored in 'user_profiles' table
await supabase
  .from("user_profiles")
  .update({ username, is_onboarded: true })
  .eq("id", userId);
```

## Testing

To test the auth feature:

1. **Sign Up**
   ```typescript
   const { signUp } = useAuth();
   await signUp({
     email: "test@example.com",
     password: "Password123",
     confirmPassword: "Password123",
     username: "testuser"
   });
   ```

2. **Sign In**
   ```typescript
   const { signIn } = useAuth();
   await signIn({
     email: "test@example.com",
     password: "Password123"
   });
   ```

3. **Sign Out**
   ```typescript
   const { signOut } = useAuth();
   await signOut();
   ```

## Migration from Old Structure

The auth feature has been migrated from:
- `/src/state/authStore.ts` → `/src/features/auth/stores/authStore.ts`
- `/src/utils/auth.ts` → `/src/features/auth/services/authService.ts`
- `/src/types/auth.ts` → `/src/features/auth/types/auth.types.ts`
- `/src/screens/SignInScreen.tsx` → `/app/(auth)/sign-in.tsx`
- `/src/screens/SignUpScreen.tsx` → `/app/(auth)/sign-up.tsx`

All functionality remains identical - only the organization has changed.

## Best Practices

1. **Always use hooks for auth state**
   ```typescript
   // Good
   const { user, isAuthenticated } = useAuth();

   // Avoid
   const user = useAuthStore((state) => state.user);
   ```

2. **Import from feature index**
   ```typescript
   // Good
   import { useAuth, AuthButton } from "@/src/features/auth";

   // Avoid
   import { useAuth } from "@/src/features/auth/hooks/useAuth";
   ```

3. **Handle errors properly**
   ```typescript
   try {
     await signIn(credentials);
   } catch (error) {
     if (error instanceof AuthError) {
       // Handle specific auth errors
       Alert.alert("Error", error.message);
     }
   }
   ```

4. **Use protected routes**
   ```typescript
   // In your root layout
   useProtectedRoute();
   ```

## Future Enhancements

Potential improvements:
- [ ] Social authentication (Google, Apple)
- [ ] Biometric authentication
- [ ] Multi-factor authentication
- [ ] Account recovery options
- [ ] Email verification flow
- [ ] Password change flow
- [ ] Account deletion
