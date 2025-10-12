#!/bin/bash

set -e

echo "🔧 Running post-install hook..."

# Run patch-package
echo "📦 Applying patches..."
npx patch-package

# Patch Folly for iOS builds
if [ "$EAS_BUILD_PLATFORM" == "ios" ]; then
  echo "🍎 Patching Folly for iOS..."

  # Check if Folly headers exist
  if [ -f "ios/Pods/RCT-Folly/folly/Expected.h" ]; then
    echo "✅ Found Folly headers, applying coroutine patch..."
    sed -i.bak 's/#if FOLLY_HAS_COROUTINES/#if 0 \/\/ FOLLY_HAS_COROUTINES/' ios/Pods/RCT-Folly/folly/Expected.h
    echo "✅ Patched Expected.h"
  else
    echo "⚠️  Expected.h not found, skipping..."
  fi

  if [ -f "ios/Pods/RCT-Folly/folly/Optional.h" ]; then
    sed -i.bak 's/#if FOLLY_HAS_COROUTINES/#if 0 \/\/ FOLLY_HAS_COROUTINES/' ios/Pods/RCT-Folly/folly/Optional.h
    echo "✅ Patched Optional.h"
  else
    echo "⚠️  Optional.h not found, skipping..."
  fi

  echo "✨ Folly patching complete!"
else
  echo "🤖 Android build detected, skipping Folly patch"
fi

echo "✅ Post-install hook completed!"
