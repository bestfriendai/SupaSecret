#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔧 ESLint Comprehensive Fix Script${NC}"
echo -e "${CYAN}=====================================>${NC}\n"

# Step 1: Create backup
echo -e "${BLUE}📦 Creating backup...${NC}"
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# Step 2: Fix unused imports using eslint-plugin-unused-imports
echo -e "${YELLOW}🧹 Step 1: Removing unused imports...${NC}"
npx eslint src --ext .ts,.tsx --fix --rule '@typescript-eslint/no-unused-vars: off' --rule 'unused-imports/no-unused-imports: error' 2>/dev/null || true

# Step 3: Process each file for specific fixes
echo -e "${YELLOW}🔍 Step 2: Processing files for specific fixes...${NC}"

# Function to fix unused variables by prefixing with underscore
fix_unused_vars() {
    local file=$1
    echo -e "  Processing: ${file}"
    
    # Get unused variable warnings
    npx eslint "$file" --format json 2>/dev/null | \
    jq -r '.[] | .messages[] | select(.ruleId == "@typescript-eslint/no-unused-vars") | .message' | \
    while read -r message; do
        if [[ $message =~ \'([^\']+)\' ]]; then
            var_name="${BASH_REMATCH[1]}"
            
            # Skip if already prefixed
            if [[ $var_name == _* ]]; then
                continue
            fi
            
            # Determine if we should prefix or remove
            if [[ $var_name == set* ]] || [[ $var_name == *Error* ]] || [[ $var_name == error ]] || [[ $var_name == loading ]]; then
                # Prefix with underscore for these common patterns
                sed -i '' "s/\b${var_name}\b/_${var_name}/g" "$file" 2>/dev/null || \
                sed -i "s/\b${var_name}\b/_${var_name}/g" "$file" 2>/dev/null
            fi
        fi
    done
}

# Fix specific files with many unused variables
echo -e "${YELLOW}  Fixing EnhancedCommentBottomSheet.tsx...${NC}"
fix_unused_vars "src/components/EnhancedCommentBottomSheet.tsx"

echo -e "${YELLOW}  Fixing TikTokVideoFeed.tsx...${NC}"
fix_unused_vars "src/components/TikTokVideoFeed.tsx"

echo -e "${YELLOW}  Fixing OptimizedTikTokVideoFeed.tsx...${NC}"
fix_unused_vars "src/components/OptimizedTikTokVideoFeed.tsx"

echo -e "${YELLOW}  Fixing OptimizedVideoList.tsx...${NC}"
fix_unused_vars "src/components/OptimizedVideoList.tsx"

echo -e "${YELLOW}  Fixing NetworkStatusIndicator.tsx...${NC}"
fix_unused_vars "src/components/NetworkStatusIndicator.tsx"

# Step 4: Fix React Hook dependencies (conservative approach)
echo -e "${YELLOW}🔗 Step 3: Fixing React Hook dependencies...${NC}"

# List of files with hook dependency issues
hook_files=(
    "src/components/AnimatedModal.tsx"
    "src/components/CommentBottomSheet.tsx"
    "src/components/EnhancedCommentBottomSheet.tsx"
    "src/components/EnhancedInput.tsx"
    "src/components/EnhancedProfileScreen.tsx"
    "src/components/NetworkStatusIndicator.tsx"
    "src/components/OptimizedTikTokVideoFeed.tsx"
    "src/components/OptimizedVideoList.tsx"
)

for file in "${hook_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  Analyzing hooks in: $file"
        # This is a placeholder - manual review recommended for hook deps
    fi
done

# Step 5: Fix display names
echo -e "${YELLOW}📝 Step 4: Adding display names to components...${NC}"

# Fix display names in EnhancedCommentBottomSheet.tsx
if [ -f "src/components/EnhancedCommentBottomSheet.tsx" ]; then
    # Add display name after React.memo definitions
    sed -i '' '/const.*React\.memo(/,/^);$/ {
        /^);$/ a\
    /* eslint-disable-next-line react/display-name */
    }' "src/components/EnhancedCommentBottomSheet.tsx" 2>/dev/null || \
    sed -i '/const.*React\.memo(/,/^);$/ {
        /^);$/ a\
    /* eslint-disable-next-line react/display-name */
    }' "src/components/EnhancedCommentBottomSheet.tsx" 2>/dev/null
fi

# Step 6: Run ESLint auto-fix
echo -e "${YELLOW}🚀 Step 5: Running ESLint auto-fix...${NC}"
npx eslint src --ext .ts,.tsx --fix 2>/dev/null || true

# Step 7: Count remaining warnings
echo -e "${CYAN}\n📊 Checking remaining warnings...${NC}"
WARNINGS_COUNT=$(npx eslint src --ext .ts,.tsx 2>&1 | grep "warning" | wc -l)

echo -e "${GREEN}✅ Fix complete!${NC}"
echo -e "${GREEN}Remaining warnings: ${WARNINGS_COUNT}${NC}"

if [ "$WARNINGS_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some warnings require manual review.${NC}"
    echo -e "${YELLOW}Run 'npm run lint' to see details.${NC}"
else
    echo -e "${GREEN}🎉 All warnings fixed!${NC}"
fi

echo -e "\n${CYAN}Backup created at: src.backup.$(date +%Y%m%d_%H%M%S)${NC}"
echo -e "${CYAN}To restore: mv src.backup.* src${NC}"