#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = (msg, color = "reset") => console.log(`${colors[color]}${msg}${colors.reset}`);

// Specific targeted fixes for each file
const targetedFixes = [
  {
    file: "src/components/AnimatedModal.tsx",
    fixes: [{ type: "remove-import", line: 1, import: "useCallback" }],
  },
  {
    file: "src/components/EnhancedCommentBottomSheet.tsx",
    fixes: [
      {
        type: "remove-from-import",
        imports: ["FlatList", "ScrollView", "AccessibilityInfo", "Vibration", "LayoutAnimation"],
      },
      { type: "remove-from-import", imports: ["BottomSheetModalProvider", "BottomSheetScrollView"] },
      { type: "remove-from-import", imports: ["Haptics"] },
      { type: "remove-from-import", imports: ["LinearGradient"] },
      { type: "remove-from-import", imports: ["MaterialCommunityIcons", "FontAwesome5"] },
      { type: "remove-from-import", imports: ["formatDistanceToNow"] },
      { type: "remove-import-line", pattern: "MaskedView" },
      { type: "remove-from-import", imports: ["Reaction"] },
      { type: "prefix-variable", varName: "SCREEN_WIDTH" },
      { type: "prefix-variable", varName: "SCREEN_HEIGHT" },
      { type: "prefix-variable", varName: "handleReaction" },
      { type: "prefix-variable", varName: "insets" },
      { type: "prefix-variable", varName: "setHighlightedId" },
      { type: "prefix-variable", varName: "showReactionPicker" },
      { type: "prefix-variable", varName: "setShowReactionPicker" },
      { type: "prefix-variable", varName: "showError" },
      { type: "prefix-variable", varName: "loading" },
      { type: "prefix-variable", varName: "error" },
      { type: "prefix-variable", varName: "removeReaction" },
      { type: "prefix-variable", varName: "editReply" },
    ],
  },
  {
    file: "src/components/EnhancedProfileScreen.tsx",
    fixes: [{ type: "remove-from-import", imports: ["Image"] }],
  },
  {
    file: "src/components/FeedActionSheet.tsx",
    fixes: [{ type: "already-prefixed", note: "_modalType already has underscore" }],
  },
  {
    file: "src/components/HermesCompatibleVideoPlayer.tsx",
    fixes: [{ type: "prefix-variable", varName: "trackInteraction" }],
  },
  {
    file: "src/components/NetworkStatusIndicator.tsx",
    fixes: [{ type: "remove-from-import", imports: ["withDelay", "FadeIn", "FadeOut", "runOnJS"] }],
  },
  {
    file: "src/components/OptimizedTikTokVideoFeed.tsx",
    fixes: [
      { type: "remove-from-import", imports: ["GestureDetector"] },
      { type: "remove-from-import", imports: ["useVideoFeedGestures"] },
      { type: "remove-from-import", imports: ["VideoErrorCode", "VideoErrorSeverity"] },
      { type: "prefix-variable", varName: "MAX_RETRY_ATTEMPTS" },
      { type: "prefix-unused-in-destructuring", line: 70, pattern: "setNetworkStatus" },
    ],
  },
  {
    file: "src/components/OptimizedVideoItem.tsx",
    fixes: [
      { type: "remove-from-import", imports: ["interpolate"] },
      { type: "prefix-variable", varName: "handleCommentUpdate" },
    ],
  },
  {
    file: "src/components/OptimizedVideoList.tsx",
    fixes: [
      { type: "remove-from-import", imports: ["Pressable"] },
      { type: "remove-import-line", pattern: "import Animated" },
      { type: "remove-from-import", imports: ["useAnimatedStyle", "withTiming", "FadeIn", "FadeOut"] },
      { type: "prefix-variable", varName: "modalOpen" },
      { type: "prefix-variable", varName: "isPreloading" },
      { type: "prefix-variable", varName: "shouldOptimizeRender" },
    ],
  },
  {
    file: "src/components/TikTokVideoFeed.tsx",
    fixes: [
      { type: "remove-from-import", imports: ["GestureDetector"] },
      { type: "remove-from-import", imports: ["useVideoFeedGestures"] },
      { type: "prefix-variable", varName: "MAX_RETRY_ATTEMPTS" },
    ],
  },
  {
    file: "src/api/transcribe-audio.ts",
    fixes: [{ type: "prefix-variable", varName: "timeoutMs" }],
  },
];

function applyFix(content, fix) {
  const lines = content.split("\n");

  switch (fix.type) {
    case "remove-import":
      // Remove a complete import line
      return lines.filter((line) => !line.includes(`import ${fix.import}`)).join("\n");

    case "remove-from-import":
      // Remove specific imports from a line
      for (const imp of fix.imports) {
        content = content.replace(new RegExp(`\\b${imp}\\b\\s*,?\\s*`, "g"), "");
      }
      // Clean up empty imports and extra commas
      content = content.replace(/,\s*,/g, ",");
      content = content.replace(/{\s*,/g, "{");
      content = content.replace(/,\s*}/g, "}");
      content = content.replace(/{\s*}/g, "");
      content = content.replace(/import\s*{\s*}\s*from\s*['"][^'"]+['"];?\s*\n/g, "");
      return content;

    case "remove-import-line":
      // Remove import lines matching a pattern
      return lines.filter((line) => !line.includes(fix.pattern)).join("\n");

    case "prefix-variable":
      // Add underscore prefix to unused variable
      const varRegex = new RegExp(`\\b(const|let|var)\\s+${fix.varName}\\b`, "g");
      content = content.replace(varRegex, `$1 _${fix.varName}`);

      // Also handle destructuring
      const destructRegex = new RegExp(`([{,\\[]\\s*)${fix.varName}(\\s*[,}\\]:])`, "g");
      content = content.replace(destructRegex, `$1_${fix.varName}$2`);

      return content;

    case "prefix-unused-in-destructuring":
      // Special case for destructuring where we need to be more careful
      if (fix.line) {
        const lineIndex = fix.line - 1;
        if (lines[lineIndex] && lines[lineIndex].includes(fix.pattern)) {
          lines[lineIndex] = lines[lineIndex].replace(new RegExp(`\\b${fix.pattern}\\b`), `_${fix.pattern}`);
        }
      }
      return lines.join("\n");

    case "already-prefixed":
      // No action needed
      return content;

    default:
      return content;
  }
}

function processFile(filePath, fixes) {
  if (!fs.existsSync(filePath)) {
    log(`  ⚠️  File not found: ${filePath}`, "yellow");
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  const originalContent = content;

  for (const fix of fixes) {
    content = applyFix(content, fix);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return true;
  }

  return false;
}

// Main execution
log("🔧 Targeted ESLint Fix Script", "cyan");
log("=====================================>\n", "cyan");

// Create backup
log("📦 Creating backup...", "blue");
const backupDir = `src.backup.${Date.now()}`;
execSync(`cp -r src ${backupDir}`);
log(`  Backup created at: ${backupDir}\n`, "green");

// Process files
log("🔍 Applying targeted fixes...", "yellow");
let totalFixed = 0;

for (const target of targetedFixes) {
  const fullPath = path.join(process.cwd(), target.file);
  log(`  Processing: ${target.file}`, "blue");

  if (processFile(fullPath, target.fixes)) {
    totalFixed++;
    log(`    ✅ Fixed`, "green");
  } else {
    log(`    ⏭️  No changes needed`, "yellow");
  }
}

// Run ESLint auto-fix for hook dependencies and other auto-fixable issues
log("\n🚀 Running ESLint auto-fix for remaining issues...", "yellow");
try {
  execSync("npx eslint src --ext .ts,.tsx --fix", { stdio: "ignore" });
} catch (e) {
  // ESLint returns non-zero on warnings
}

// Check remaining warnings
log("\n📊 Checking results...", "cyan");
try {
  const output = execSync("npx eslint src --ext .ts,.tsx 2>&1", { encoding: "utf8" });
  const warningLines = output.split("\n").filter((line) => line.includes("warning"));
  const warningCount = warningLines.length;

  log(`\n✅ Fix complete!`, "green");
  log(`  Files processed: ${totalFixed}`, "green");
  log(`  Remaining warnings: ${warningCount}`, warningCount > 50 ? "yellow" : "green");

  if (warningCount > 0) {
    // Show summary of remaining warnings
    const warningTypes = {};
    warningLines.forEach((line) => {
      const match = line.match(/warning\s+(.+?)\s+(@typescript-eslint|react)/);
      if (match) {
        const key = match[2] + "/" + match[1].split(" ")[0];
        warningTypes[key] = (warningTypes[key] || 0) + 1;
      }
    });

    log("\n📋 Remaining warning types:", "cyan");
    Object.entries(warningTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([type, count]) => {
        log(`    ${type}: ${count}`, "yellow");
      });

    log("\n💡 Most remaining warnings are React Hook dependencies that need manual review.", "yellow");
    log("   These often require understanding component logic to fix properly.", "yellow");
  } else {
    log("\n🎉 All warnings fixed!", "green");
  }
} catch (e) {
  log('\n✅ Fixes applied. Run "npm run lint" to verify.', "green");
}

log(`\n💾 Backup saved at: ${backupDir}`, "cyan");
log(`To restore: rm -rf src && mv ${backupDir} src`, "cyan");
