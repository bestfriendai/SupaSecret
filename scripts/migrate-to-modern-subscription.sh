#!/bin/bash

# Migration Script: Consolidate to Modern Subscription Store
# This script updates all files to use the modern subscription implementation

set -e

echo "🚀 Starting migration to modern subscription store..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup directory
BACKUP_DIR=".migration-backup-$(date +%Y%m%d-%H%M%S)"

echo "📦 Creating backup in $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Files to update
FILES_TO_UPDATE=(
  "src/screens/ProfileScreen.tsx"
  "src/components/OptimizedAdBanner.tsx"
  "src/components/PaywallModal.tsx"
  "src/components/ads/FeedAdComponent.tsx"
  "src/components/ads/BannerAdComponent.tsx"
)

# Backup files
for file in "${FILES_TO_UPDATE[@]}"; do
  if [ -f "$file" ]; then
    echo "  Backing up $file..."
    cp "$file" "$BACKUP_DIR/"
  fi
done

# Backup the legacy store
if [ -f "src/state/subscriptionStore.ts" ]; then
  echo "  Backing up src/state/subscriptionStore.ts..."
  cp "src/state/subscriptionStore.ts" "$BACKUP_DIR/"
fi

echo ""
echo "✅ Backup complete!"
echo ""

# Function to update imports
update_imports() {
  local file=$1
  echo "  📝 Updating imports in $file..."
  
  # Replace old import with new import
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' 's|from "../state/subscriptionStore"|from "../features/subscription"|g' "$file"
    sed -i '' 's|from "../../state/subscriptionStore"|from "../../features/subscription"|g' "$file"
    sed -i '' 's|from "../../../state/subscriptionStore"|from "../../../features/subscription"|g' "$file"
  else
    # Linux
    sed -i 's|from "../state/subscriptionStore"|from "../features/subscription"|g' "$file"
    sed -i 's|from "../../state/subscriptionStore"|from "../../features/subscription"|g' "$file"
    sed -i 's|from "../../../state/subscriptionStore"|from "../../../features/subscription"|g' "$file"
  fi
}

# Update each file
echo "🔄 Updating imports..."
for file in "${FILES_TO_UPDATE[@]}"; do
  if [ -f "$file" ]; then
    update_imports "$file"
  else
    echo -e "  ${YELLOW}⚠️  File not found: $file${NC}"
  fi
done

echo ""
echo "✅ Import updates complete!"
echo ""

# Rename legacy store to .old
if [ -f "src/state/subscriptionStore.ts" ]; then
  echo "📦 Renaming legacy store to subscriptionStore.ts.old..."
  mv "src/state/subscriptionStore.ts" "src/state/subscriptionStore.ts.old"
  echo "✅ Legacy store renamed!"
else
  echo -e "${YELLOW}⚠️  Legacy store not found${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Migration complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Review the changes:"
echo "   git diff"
echo ""
echo "2. Test the app:"
echo "   npm start"
echo ""
echo "3. Test subscription flows:"
echo "   - View premium status in profile"
echo "   - Check ad hiding for premium users"
echo "   - Test paywall modal"
echo "   - Test purchase flow"
echo ""
echo "4. If everything works, commit the changes:"
echo "   git add ."
echo "   git commit -m 'Migrate to modern subscription store'"
echo ""
echo "5. If there are issues, restore from backup:"
echo "   ./scripts/restore-subscription-backup.sh $BACKUP_DIR"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}⚠️  Important: Test thoroughly before committing!${NC}"
echo ""

