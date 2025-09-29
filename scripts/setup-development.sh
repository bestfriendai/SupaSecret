#!/bin/bash

# Development Setup Script for SupaSecret
# This script sets up the development environment with all required dependencies

echo "🚀 Setting up SupaSecret development environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for critical development dependencies
echo "🔍 Verifying critical native dependencies..."

# Check package.json for required packages
REQUIRED_PACKAGES=(
    "@react-native-ml-kit/face-detection"
    "ffmpeg-kit-react-native-community"
    "react-native-purchases"
    "react-native-vision-camera"
)

MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! npm list "$package" > /dev/null 2>&1; then
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo "⚠️  Missing required packages: ${MISSING_PACKAGES[*]}"
    echo "📦 Installing missing packages..."
    npm install "${MISSING_PACKAGES[@]}"
else
    echo "✅ All required packages are installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please update it with your development credentials."
    else
        echo "⚠️  No .env.example found. You'll need to create a .env file manually."
    fi
fi

# Create development configuration
echo "⚙️  Setting up development configuration..."

# Check if app.config.js is properly configured for development
if grep -q "process.env.npm_lifecycle_event === \"start\"" app.config.js; then
    echo "✅ App config is set up for development builds"
else
    echo "⚠️  App config may need development build configuration"
fi

# Run type checking
echo "🔍 Running TypeScript type check..."
if npm run typecheck; then
    echo "✅ TypeScript check passed"
else
    echo "⚠️  TypeScript check failed - check for type errors"
fi

# Run linting
echo "🔍 Running ESLint..."
if npm run lint; then
    echo "✅ Linting passed"
else
    echo "⚠️  Linting issues found - run 'npm run lint' to see details"
fi

# Check for iOS/Android build requirements
echo "📱 Checking platform requirements..."

if command -v xcodebuild &> /dev/null; then
    echo "✅ Xcode found - iOS development ready"
else
    echo "⚠️  Xcode not found - iOS development not available"
fi

if [ -d "$ANDROID_HOME" ] || [ -d "$ANDROID_SDK_ROOT" ]; then
    echo "✅ Android SDK found - Android development ready"
else
    echo "⚠️  Android SDK not found - set ANDROID_HOME or ANDROID_SDK_ROOT"
fi

# Create development guide
cat > DEVELOPMENT_SETUP.md << 'EOF'
# Development Setup Guide

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Set up Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your development credentials
   ```

3. **Start Development Server**:
   ```bash
   npm start
   ```

4. **Build for Development**:
   ```bash
   # iOS
   npm run ios
   
   # Android  
   npm run android
   ```

## Native Dependencies Status

✅ **Installed**:
- @react-native-ml-kit/face-detection (for face blur)
- ffmpeg-kit-react-native-community (for video/audio processing)  
- react-native-purchases (for RevenueCat)
- react-native-vision-camera (for advanced camera features)

## Development vs Production

### Development Mode Features:
- Face blur and voice processing work in development builds
- Full RevenueCat integration
- Real-time video processing
- Advanced camera features

### Expo Go Limitations:
- Face blur falls back to general blur
- Voice processing simulation only
- RevenueCat demo mode
- Basic camera functionality

## Testing Native Features

To test face blur and voice processing:
1. Build a development build (not Expo Go)
2. Use `npm run ios` or `npm run android`
3. Test on physical device for best results

## Environment Variables Required

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# RevenueCat (use test keys for development)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_test_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_test_android_key

# AdMob (use test IDs for development)
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-3940256099942544~1458002511
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-3940256099942544~3347511713

# AI Services (optional for development)
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key
```

## Common Development Issues

### Face Blur Not Working:
- Ensure you're using a development build, not Expo Go
- Check that @react-native-ml-kit/face-detection is installed
- Test on physical device

### Voice Processing Issues:
- Requires development build
- Test with different voice effects (deep/light)
- Check ffmpeg-kit installation

### RevenueCat Issues:
- Use test API keys for development
- Enable debug logging in development
- Check subscription product configuration

## Building for Testing

```bash
# Development build with EAS
eas build --profile development --platform ios
eas build --profile development --platform android

# Local development build  
npx expo run:ios
npx expo run:android
```
EOF

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update .env file with your development credentials"
echo "2. Review DEVELOPMENT_SETUP.md for detailed instructions"
echo "3. Build a development build to test native features:"
echo "   - npm run ios (for iOS)"
echo "   - npm run android (for Android)"
echo ""
echo "⚠️  Important: Face blur and voice processing require a development build (not Expo Go)"
echo ""