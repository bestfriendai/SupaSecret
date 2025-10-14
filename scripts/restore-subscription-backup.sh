#!/bin/bash

# Restore Script: Restore from subscription migration backup

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Backup directory not specified"
  echo "Usage: ./scripts/restore-subscription-backup.sh <backup-directory>"
  exit 1
fi

BACKUP_DIR=$1

if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Error: Backup directory not found: $BACKUP_DIR"
  exit 1
fi

echo "🔄 Restoring from backup: $BACKUP_DIR"
echo ""

# Restore all files from backup
for file in "$BACKUP_DIR"/*; do
  filename=$(basename "$file")
  
  # Determine destination
  if [[ "$filename" == "subscriptionStore.ts" ]]; then
    dest="src/state/$filename"
  elif [[ "$filename" == "ProfileScreen.tsx" ]]; then
    dest="src/screens/$filename"
  elif [[ "$filename" == "OptimizedAdBanner.tsx" ]] || [[ "$filename" == "PaywallModal.tsx" ]]; then
    dest="src/components/$filename"
  elif [[ "$filename" == "FeedAdComponent.tsx" ]] || [[ "$filename" == "BannerAdComponent.tsx" ]]; then
    dest="src/components/ads/$filename"
  else
    echo "⚠️  Unknown file: $filename (skipping)"
    continue
  fi
  
  echo "  Restoring $dest..."
  cp "$file" "$dest"
done

# Restore .old file if it exists
if [ -f "src/state/subscriptionStore.ts.old" ]; then
  echo "  Restoring src/state/subscriptionStore.ts from .old..."
  mv "src/state/subscriptionStore.ts.old" "src/state/subscriptionStore.ts"
fi

echo ""
echo "✅ Restore complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify files are restored: git status"
echo "2. Test the app: npm start"
echo ""

