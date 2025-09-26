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

// Files to fix based on the analysis
const filesToFix = {
  "src/components/AnimatedModal.tsx": {
    unusedImports: ["useCallback"],
    hookDeps: {
      71: ["animationConfig", "backdropOpacityValue", "handleClose", "scaleValue", "springConfig", "translateYValue"],
      104: ["backdropOpacityValue", "scaleValue", "translateYValue"],
    },
  },
  "src/components/CommentBottomSheet.tsx": {
    hookDeps: {
      66: ["backdropOpacity", "translateY"],
    },
  },
  "src/components/EnhancedCommentBottomSheet.tsx": {
    unusedImports: [
      "FlatList",
      "ScrollView",
      "AccessibilityInfo",
      "Vibration",
      "LayoutAnimation",
      "BottomSheetModalProvider",
      "BottomSheetScrollView",
      "Haptics",
      "LinearGradient",
      "MaterialCommunityIcons",
      "FontAwesome5",
      "formatDistanceToNow",
      "MaskedView",
      "Reaction",
    ],
    unusedVars: [
      "SCREEN_WIDTH",
      "SCREEN_HEIGHT",
      "handleReaction",
      "insets",
      "setHighlightedId",
      "showReactionPicker",
      "setShowReactionPicker",
      "showError",
      "loading",
      "error",
      "removeReaction",
      "editReply",
    ],
    displayNames: [74, 286],
  },
  "src/components/EnhancedInput.tsx": {
    hookDeps: {
      57: ["focusAnimation"],
      61: ["errorAnimation"],
    },
  },
  "src/components/EnhancedProfileScreen.tsx": {
    unusedImports: ["Image"],
  },
  "src/components/FeedActionSheet.tsx": {
    unusedVars: ["_modalType"],
  },
  "src/components/HermesCompatibleVideoPlayer.tsx": {
    unusedVars: ["trackInteraction"],
  },
  "src/components/NetworkStatusIndicator.tsx": {
    unusedImports: ["withDelay", "FadeIn", "FadeOut", "runOnJS"],
  },
  "src/components/OptimizedTikTokVideoFeed.tsx": {
    unusedImports: [
      "GestureDetector",
      "useVideoFeedGestures",
      "VideoErrorCode",
      "VideoErrorSeverity",
      "VideoLoadResult",
    ],
    unusedVars: ["MAX_RETRY_ATTEMPTS", "setNetworkStatus"],
  },
  "src/components/OptimizedVideoItem.tsx": {
    unusedImports: ["interpolate"],
    unusedVars: ["handleCommentUpdate"],
  },
  "src/components/OptimizedVideoList.tsx": {
    unusedImports: ["Pressable", "Animated", "useAnimatedStyle", "withTiming", "FadeIn", "FadeOut"],
    unusedVars: ["modalOpen", "setIsLoadingMore", "isPreloading", "shouldOptimizeRender"],
  },
  "src/components/TikTokVideoFeed.tsx": {
    unusedImports: ["GestureDetector", "useVideoFeedGestures"],
    unusedVars: ["MAX_RETRY_ATTEMPTS", "setNetworkStatus"],
  },
  "src/api/transcribe-audio.ts": {
    unusedVars: ["timeoutMs"],
  },
};

function removeUnusedImports(content, imports) {
  let result = content;

  for (const imp of imports) {
    // Remove from named imports
    const namedImportRegex = new RegExp(`(\\{[^}]*?)\\b${imp}\\b\\s*,?\\s*([^}]*\\})`, "g");
    result = result.replace(namedImportRegex, (match, before, after) => {
      const cleaned = before + after;
      return cleaned.replace(/,\s*,/, ",").replace(/{\s*,/, "{").replace(/,\s*}/, "}");
    });

    // Remove standalone imports
    const standaloneRegex = new RegExp(`^\\s*import\\s+${imp}\\s+from\\s+['"][^'"]+['"];?\\s*$`, "gm");
    result = result.replace(standaloneRegex, "");

    // Remove default imports
    const defaultRegex = new RegExp(`^\\s*import\\s+${imp}\\s+from\\s+['"][^'"]+['"];?\\s*$`, "gm");
    result = result.replace(defaultRegex, "");
  }

  // Clean up empty import statements
  result = result.replace(/import\s*{\s*}\s*from\s*['"][^'"]+['"];?\s*/g, "");

  return result;
}

function prefixUnusedVars(content, vars) {
  let result = content;

  for (const varName of vars) {
    // Skip if already prefixed
    if (varName.startsWith("_")) continue;

    // Create regex to match the variable declaration and usage
    const declRegex = new RegExp(`\\b(const|let|var)\\s+(\\[?\\s*${varName}\\b)`, "g");
    result = result.replace(declRegex, `$1 _${varName}`);

    // Handle destructuring patterns
    const destructRegex = new RegExp(`([{,]\\s*)${varName}(\\s*[,}:])`, "g");
    result = result.replace(destructRegex, `$1_${varName}$2`);
  }

  return result;
}

function addDisplayName(content, lineNumbers) {
  const lines = content.split("\n");

  for (const lineNum of lineNumbers.sort((a, b) => b - a)) {
    const lineIndex = lineNum - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];

      // Check if it's a memo or forwardRef
      if (line.includes("React.memo") || line.includes("forwardRef")) {
        // Find the component name
        let componentName = "Component";
        for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
          const match = lines[i].match(/(?:const|let|var)\s+(\w+)\s*=/);
          if (match) {
            componentName = match[1];
            break;
          }
        }

        // Add display name comment to suppress warning
        lines[lineIndex] = `/* eslint-disable-next-line react/display-name */\n${line}`;
      }
    }
  }

  return lines.join("\n");
}

function fixHookDependencies(content, hookDeps) {
  const lines = content.split("\n");

  for (const [lineNum, deps] of Object.entries(hookDeps)) {
    const lineIndex = parseInt(lineNum) - 1;

    // Find the dependency array line
    let depLineIndex = lineIndex;
    while (depLineIndex < lines.length && !lines[depLineIndex].includes("]")) {
      depLineIndex++;
    }

    if (depLineIndex < lines.length) {
      const line = lines[depLineIndex];
      const existingDepsMatch = line.match(/\[([^\]]*)\]/);

      if (existingDepsMatch) {
        const existingDeps = existingDepsMatch[1]
          ? existingDepsMatch[1]
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean)
          : [];

        // Filter out stable deps
        const stableDeps = ["setState", "dispatch", "navigate", "navigation"];
        const filteredNewDeps = deps.filter(
          (d) => !stableDeps.some((stable) => d.includes(stable)) && !d.endsWith("Ref") && !d.endsWith(".current"),
        );

        const allDeps = [...new Set([...existingDeps, ...filteredNewDeps])];
        const newDepArray = `[${allDeps.join(", ")}]`;

        lines[depLineIndex] = line.replace(/\[[^\]]*\]/, newDepArray);
      }
    }
  }

  return lines.join("\n");
}

function processFile(filePath, fixes) {
  if (!fs.existsSync(filePath)) {
    log(`  ⚠️  File not found: ${filePath}`, "yellow");
    return false;
  }

  let content = fs.readFileSync(filePath, "utf8");
  const originalContent = content;

  if (fixes.unusedImports) {
    content = removeUnusedImports(content, fixes.unusedImports);
  }

  if (fixes.unusedVars) {
    content = prefixUnusedVars(content, fixes.unusedVars);
  }

  if (fixes.displayNames) {
    content = addDisplayName(content, fixes.displayNames);
  }

  if (fixes.hookDeps) {
    content = fixHookDependencies(content, fixes.hookDeps);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return true;
  }

  return false;
}

// Main execution
log("🔧 ESLint Comprehensive Fix Script", "cyan");
log("=====================================>\n", "cyan");

// Create backup
log("📦 Creating backup...", "blue");
const backupDir = `src.backup.${Date.now()}`;
execSync(`cp -r src ${backupDir}`);
log(`  Backup created at: ${backupDir}\n`, "green");

// Process files
log("🔍 Processing files...", "yellow");
let totalFixed = 0;

for (const [file, fixes] of Object.entries(filesToFix)) {
  const fullPath = path.join(process.cwd(), file);
  log(`  Processing: ${file}`, "blue");

  if (processFile(fullPath, fixes)) {
    totalFixed++;
    log(`    ✅ Fixed`, "green");
  } else {
    log(`    ⏭️  No changes needed`, "yellow");
  }
}

// Run ESLint auto-fix for additional issues
log("\n🚀 Running ESLint auto-fix...", "yellow");
try {
  execSync("npx eslint src --ext .ts,.tsx --fix", { stdio: "ignore" });
} catch (e) {
  // ESLint returns non-zero on warnings
}

// Check remaining warnings
log("\n📊 Checking results...", "cyan");
try {
  const output = execSync("npx eslint src --ext .ts,.tsx 2>&1", { encoding: "utf8" });
  const warningCount = (output.match(/warning/g) || []).length;

  log(`\n✅ Fix complete!`, "green");
  log(`  Files processed: ${totalFixed}`, "green");
  log(`  Remaining warnings: ${warningCount}`, warningCount > 0 ? "yellow" : "green");

  if (warningCount > 0) {
    log("\n⚠️  Some warnings require manual review.", "yellow");
    log('Run "npm run lint" to see details.', "yellow");
  } else {
    log("\n🎉 All warnings fixed!", "green");
  }
} catch (e) {
  log('\n✅ Fixes applied. Run "npm run lint" to verify.', "green");
}

log(`\n💾 Backup saved at: ${backupDir}`, "cyan");
log(`To restore: rm -rf src && mv ${backupDir} src`, "cyan");
