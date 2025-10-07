#!/bin/bash

# Fix EAS Local Build Issues
# This script addresses common problems with local EAS builds

set -e

echo "🔧 Fixing EAS Local Build Issues..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Update EAS CLI to latest version
echo "1️⃣  Updating EAS CLI..."
if command -v eas &> /dev/null; then
    npm install -g eas-cli@latest
    print_status "EAS CLI updated to latest version"
else
    npm install -g eas-cli
    print_status "EAS CLI installed"
fi
echo ""

# 2. Clean build artifacts
echo "2️⃣  Cleaning build artifacts..."
rm -rf ios/build
rm -rf android/app/build
rm -rf android/.gradle
rm -rf .expo
rm -rf node_modules/.cache
print_status "Build artifacts cleaned"
echo ""

# 3. Clean and reinstall iOS Pods
echo "3️⃣  Cleaning iOS Pods..."
cd ios
rm -rf Pods
rm -rf Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*
print_status "iOS Pods cleaned"
echo ""

echo "4️⃣  Installing iOS Pods..."
pod install --repo-update
print_status "iOS Pods installed"
cd ..
echo ""

# 4. Fix TypeScript issues
echo "5️⃣  Checking TypeScript..."
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    print_warning "TypeScript errors found (non-blocking for builds)"
else
    print_status "No critical TypeScript errors"
fi
echo ""

# 5. Verify app.config.js
echo "6️⃣  Verifying app.config.js..."
if node -e "require('./app.config.js')" 2>&1 | grep -q "Error"; then
    print_error "app.config.js has errors"
    exit 1
else
    print_status "app.config.js is valid"
fi
echo ""

# 6. Verify eas.json
echo "7️⃣  Verifying eas.json..."
if node -e "JSON.parse(require('fs').readFileSync('eas.json', 'utf8'))" 2>&1 | grep -q "Error"; then
    print_error "eas.json has errors"
    exit 1
else
    print_status "eas.json is valid"
fi
echo ""

# 7. Check for required files
echo "8️⃣  Checking required files..."
REQUIRED_FILES=(
    "app.config.js"
    "eas.json"
    "package.json"
    "ios/Podfile"
    "google-mobile-ads.json"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "$file exists"
    else
        print_error "$file is missing"
        exit 1
    fi
done
echo ""

# 8. Fix common Xcode issues
echo "9️⃣  Fixing common Xcode issues..."
# Clear Xcode cache
rm -rf ~/Library/Caches/com.apple.dt.Xcode
# Clear module cache
rm -rf ~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex
print_status "Xcode caches cleared"
echo ""

# 9. Verify environment variables
echo "🔟 Verifying environment variables..."
if grep -q "EXPO_PUBLIC_SUPABASE_URL" eas.json; then
    print_status "Environment variables configured in eas.json"
else
    print_warning "No environment variables found in eas.json"
fi
echo ""

# 10. Check for common problematic dependencies
echo "1️⃣1️⃣  Checking dependencies..."
if grep -q '"react-native-vision-camera"' package.json; then
    print_status "Vision Camera found - ensure frame processors are enabled"
fi
if grep -q '"react-native-google-mobile-ads"' package.json; then
    print_status "Google Mobile Ads found - ensure google-mobile-ads.json exists"
fi
echo ""

# 11. Create .easignore if it doesn't exist
echo "1️⃣2️⃣  Creating .easignore..."
cat > .easignore << 'EOF'
# Documentation
*.md
docs/

# Build artifacts
build-*.ipa
build-*.tar.gz
*.log

# Development
.vscode/
.idea/

# Test files
__tests__/
*.test.ts
*.test.tsx
*.spec.ts
*.spec.tsx

# Scripts (except necessary ones)
scripts/test-*.js
scripts/verify-*.js
scripts/migrate-*.js
EOF
print_status ".easignore created"
echo ""

echo "✅ All fixes applied!"
echo ""
echo "📋 Next steps:"
echo "   1. Run: eas build --platform ios --profile local --local"
echo "   2. Or run: eas build --platform android --profile local --local"
echo ""
echo "💡 Tips:"
echo "   - Use --clear-cache flag if build still fails"
echo "   - Check build.log for detailed error messages"
echo "   - Ensure you have valid Apple Developer credentials for iOS"
echo ""

