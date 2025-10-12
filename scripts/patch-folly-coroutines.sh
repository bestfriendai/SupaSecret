#!/bin/bash

# Patch RCT-Folly to disable coroutines support
# This fixes the 'folly/coro/Coroutine.h' file not found error

set -e

echo "🔧 Patching RCT-Folly to disable coroutines..."

# Files to patch
FOLLY_HEADERS=(
  "ios/Pods/RCT-Folly/folly/Expected.h"
  "ios/Pods/RCT-Folly/folly/Optional.h"
)

PATCHED_COUNT=0
ALREADY_PATCHED_COUNT=0

for FOLLY_HEADER in "${FOLLY_HEADERS[@]}"; do
  if [ ! -f "$FOLLY_HEADER" ]; then
    echo "⚠️  File not found: $FOLLY_HEADER (skipping)"
    continue
  fi

  # Check if already patched
  if grep -q "FOLLY_HAS_COROUTINES - Disabled" "$FOLLY_HEADER"; then
    echo "✅ Already patched: $FOLLY_HEADER"
    ((ALREADY_PATCHED_COUNT++))
    continue
  fi

  # Create backup
  cp "$FOLLY_HEADER" "$FOLLY_HEADER.backup"

  # Apply patch using sed
  sed -i '' 's/#if FOLLY_HAS_COROUTINES/#if 0 \/\/ FOLLY_HAS_COROUTINES - Disabled due to missing coroutine headers in RCT-Folly/' "$FOLLY_HEADER"

  echo "✅ Patched: $FOLLY_HEADER"
  ((PATCHED_COUNT++))
done

echo ""
echo "📊 Summary:"
echo "   - Patched: $PATCHED_COUNT file(s)"
echo "   - Already patched: $ALREADY_PATCHED_COUNT file(s)"

if [ $PATCHED_COUNT -eq 0 ] && [ $ALREADY_PATCHED_COUNT -eq 0 ]; then
  echo "❌ No files were patched. Run 'pod install' first."
  exit 1
fi

echo "✅ All done!"

