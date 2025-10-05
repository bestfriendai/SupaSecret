#!/bin/bash

# Video Recording Feature - Integration Test Script
# This script helps verify the video recording implementation

set -e

echo "🎬 Video Recording Feature - Integration Test"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Checking project structure..."

# Check for required files
REQUIRED_FILES=(
    "src/services/OnDeviceVideoProcessor.ts"
    "src/services/RealTimeTranscriptionService.ts"
    "src/hooks/useVideoRecorder.ts"
    "src/screens/VideoRecordScreen.tsx"
    "src/screens/FaceBlurRecordScreen.tsx"
    "src/screens/VideoPreviewScreen.tsx"
    "src/features/confessions/services/confessionRepository.ts"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "Found: $file"
    else
        print_error "Missing: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    print_error "$MISSING_FILES required files are missing!"
    exit 1
fi

echo ""
print_status "Checking dependencies..."

# Check for required dependencies
REQUIRED_DEPS=(
    "expo-av"
    "expo-camera"
    "expo-file-system"
    "expo-speech"
    "react-native-vision-camera"
    "react-native-audio-api"
    "@shopify/react-native-skia"
)

MISSING_DEPS=0
for dep in "${REQUIRED_DEPS[@]}"; do
    if grep -q "\"$dep\"" package.json; then
        print_success "Dependency: $dep"
    else
        print_warning "Missing dependency: $dep"
        MISSING_DEPS=$((MISSING_DEPS + 1))
    fi
done

if [ $MISSING_DEPS -gt 0 ]; then
    print_warning "$MISSING_DEPS dependencies may be missing. Check package.json."
fi

echo ""
print_status "Checking database schema..."

# Check for migration files
if [ -d "supabase/migrations" ]; then
    if ls supabase/migrations/*face_blur* 1> /dev/null 2>&1; then
        print_success "Face blur migration found"
    else
        print_warning "Face blur migration not found"
    fi
else
    print_warning "Migrations directory not found"
fi

echo ""
print_status "Running TypeScript type check..."

# Run TypeScript check
if npx tsc --noEmit --skipLibCheck 2>&1 | grep -q "error TS"; then
    print_error "TypeScript errors found. Run 'npx tsc --noEmit' for details."
else
    print_success "No TypeScript errors"
fi

echo ""
print_status "Checking for TODO/FIXME comments in new files..."

# Check for TODOs in implementation files
TODO_COUNT=$(grep -r "TODO\|FIXME" src/services/OnDeviceVideoProcessor.ts src/services/RealTimeTranscriptionService.ts 2>/dev/null | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    print_warning "Found $TODO_COUNT TODO/FIXME comments in implementation files"
    grep -n "TODO\|FIXME" src/services/OnDeviceVideoProcessor.ts src/services/RealTimeTranscriptionService.ts 2>/dev/null || true
else
    print_success "No TODO/FIXME comments found"
fi

echo ""
print_status "Checking implementation completeness..."

# Check if voice processing is integrated
if grep -q "processVideoWithVoiceEffect" src/hooks/useVideoRecorder.ts; then
    print_success "Voice processing integrated in useVideoRecorder"
else
    print_error "Voice processing NOT integrated in useVideoRecorder"
fi

# Check if transcription service is integrated
if grep -q "transcriptionService" src/hooks/useVideoRecorder.ts; then
    print_success "Transcription service integrated in useVideoRecorder"
else
    print_error "Transcription service NOT integrated in useVideoRecorder"
fi

# Check if database fields are updated
if grep -q "has_face_blur" src/state/confessionStore.ts; then
    print_success "Database field 'has_face_blur' is set"
else
    print_error "Database field 'has_face_blur' NOT set"
fi

if grep -q "has_voice_change" src/state/confessionStore.ts; then
    print_success "Database field 'has_voice_change' is set"
else
    print_error "Database field 'has_voice_change' NOT set"
fi

echo ""
print_status "Implementation Summary"
echo "=============================================="

# Count implementation status
CHECKS_PASSED=0
CHECKS_TOTAL=8

[ -f "src/services/OnDeviceVideoProcessor.ts" ] && CHECKS_PASSED=$((CHECKS_PASSED + 1))
[ -f "src/services/RealTimeTranscriptionService.ts" ] && CHECKS_PASSED=$((CHECKS_PASSED + 1))
grep -q "processVideoWithVoiceEffect" src/hooks/useVideoRecorder.ts && CHECKS_PASSED=$((CHECKS_PASSED + 1))
grep -q "transcriptionService" src/hooks/useVideoRecorder.ts && CHECKS_PASSED=$((CHECKS_PASSED + 1))
grep -q "has_face_blur" src/state/confessionStore.ts && CHECKS_PASSED=$((CHECKS_PASSED + 1))
grep -q "has_voice_change" src/state/confessionStore.ts && CHECKS_PASSED=$((CHECKS_PASSED + 1))
[ -f "VIDEO_RECORDING_IMPLEMENTATION_SUMMARY.md" ] && CHECKS_PASSED=$((CHECKS_PASSED + 1))
[ -f "VIDEO_RECORDING_TESTING_GUIDE.md" ] && CHECKS_PASSED=$((CHECKS_PASSED + 1))

echo ""
echo "Checks Passed: $CHECKS_PASSED / $CHECKS_TOTAL"

if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
    print_success "All implementation checks passed! ✨"
    echo ""
    echo "Next Steps:"
    echo "1. Build the app for native testing:"
    echo "   npx expo run:ios"
    echo "   npx expo run:android"
    echo ""
    echo "2. Follow the testing guide:"
    echo "   cat VIDEO_RECORDING_TESTING_GUIDE.md"
    echo ""
    echo "3. Test the complete flow:"
    echo "   - Record video with face blur"
    echo "   - Apply voice modification"
    echo "   - Verify real-time transcription"
    echo "   - Upload and check database"
    echo ""
    exit 0
else
    print_warning "Some checks failed. Review the output above."
    echo ""
    echo "Missing implementations:"
    [ ! -f "src/services/OnDeviceVideoProcessor.ts" ] && echo "  - OnDeviceVideoProcessor.ts"
    [ ! -f "src/services/RealTimeTranscriptionService.ts" ] && echo "  - RealTimeTranscriptionService.ts"
    grep -q "processVideoWithVoiceEffect" src/hooks/useVideoRecorder.ts || echo "  - Voice processing integration"
    grep -q "transcriptionService" src/hooks/useVideoRecorder.ts || echo "  - Transcription service integration"
    grep -q "has_face_blur" src/state/confessionStore.ts || echo "  - Database field: has_face_blur"
    grep -q "has_voice_change" src/state/confessionStore.ts || echo "  - Database field: has_voice_change"
    echo ""
    exit 1
fi

