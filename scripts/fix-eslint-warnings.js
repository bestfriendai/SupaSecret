#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

class ESLintFixer {
  constructor() {
    this.stats = {
      unusedVars: 0,
      unusedImports: 0,
      hookDeps: 0,
      displayNames: 0,
      totalFixed: 0,
      filesProcessed: 0,
    };
  }

  log(message, color = "reset") {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async collectWarnings() {
    try {
      const { stdout } = await execAsync("npx eslint src --ext .ts,.tsx --format json");
      return JSON.parse(stdout);
    } catch (error) {
      // ESLint exits with error code when there are warnings/errors
      if (error.stdout) {
        return JSON.parse(error.stdout);
      }
      throw error;
    }
  }

  // Fix unused imports and variables
  fixUnusedVarsAndImports(content, messages) {
    let fixed = content;
    const unusedItems = messages
      .filter((m) => m.ruleId === "@typescript-eslint/no-unused-vars")
      .sort((a, b) => b.line - a.line); // Process from bottom to top

    for (const warning of unusedItems) {
      const lines = fixed.split("\n");
      const lineIndex = warning.line - 1;
      const line = lines[lineIndex];

      if (!line) continue;

      // Check if it's an import statement
      if (line.includes("import")) {
        // Handle different import patterns
        const importMatch = line.match(
          /import\s+(?:type\s+)?(?:\*\s+as\s+\w+|\{[^}]+\}|\w+)(?:\s*,\s*(?:\{[^}]+\}|\w+))?\s+from\s+['"][^'"]+['"]/,
        );

        if (importMatch) {
          const warningText = warning.message.match(/'([^']+)'/)?.[1];

          if (warningText) {
            // Check if it's a named import
            if (line.includes("{")) {
              const namedImports = line.match(/\{([^}]+)\}/)?.[1];
              if (namedImports) {
                const imports = namedImports.split(",").map((i) => i.trim());
                const filteredImports = imports.filter((imp) => {
                  const importName = imp.split(/\s+as\s+/)[1] || imp;
                  return !importName.includes(warningText);
                });

                if (filteredImports.length === 0) {
                  // Remove entire import line
                  lines.splice(lineIndex, 1);
                  this.stats.unusedImports++;
                } else {
                  // Update import line
                  const newImports = `{ ${filteredImports.join(", ")} }`;
                  lines[lineIndex] = line.replace(/\{[^}]+\}/, newImports);
                  this.stats.unusedImports++;
                }
              }
            } else if (line.includes(warningText)) {
              // Default or namespace import
              lines.splice(lineIndex, 1);
              this.stats.unusedImports++;
            }
          }
        }
      } else {
        // Handle unused variables
        const varName = warning.message.match(/'([^']+)'/)?.[1];

        if (varName) {
          // Check for common patterns that should be prefixed with underscore
          const patterns = [
            /const\s+(\w+)\s*=\s*.*catch/, // Error handlers
            /const\s+\[\s*\w+\s*,\s*(\w+)\s*\]/, // Array destructuring
            /const\s+\{\s*[^}]*(\w+)[^}]*\}/, // Object destructuring
          ];

          let shouldPrefix = false;

          // Check if it's a setState function or error variable
          if (varName.startsWith("set") || varName === "error" || varName.includes("Error")) {
            // For setState functions or error variables, prefix with underscore
            const regex = new RegExp(`\\b${varName}\\b`, "g");
            lines[lineIndex] = lines[lineIndex].replace(regex, `_${varName}`);
            this.stats.unusedVars++;
            shouldPrefix = true;
          } else if (line.includes(`${varName}`) && !line.includes(`_${varName}`)) {
            // For other unused variables, comment out or remove
            if (line.trim().startsWith("const") || line.trim().startsWith("let")) {
              // Comment out variable declaration
              lines[lineIndex] = `// ${line} // Removed: unused variable`;
              this.stats.unusedVars++;
            }
          }
        }
      }

      fixed = lines.join("\n");
    }

    return fixed;
  }

  // Fix React Hook dependencies
  fixHookDependencies(content, messages) {
    let fixed = content;
    const hookWarnings = messages.filter((m) => m.ruleId === "react-hooks/exhaustive-deps");

    for (const warning of hookWarnings) {
      const lines = fixed.split("\n");
      const lineIndex = warning.line - 1;

      // Extract missing dependencies from the message
      const depsMatch = warning.message.match(/missing dependencies?: (.+)\. Either/);
      if (depsMatch) {
        const missingDeps = depsMatch[1]
          .replace(/'/g, "")
          .replace(/and /g, "")
          .split(",")
          .map((d) => d.trim())
          .filter((d) => {
            // Filter out stable values that don't need to be in deps
            return !d.includes("setState") && !d.includes("dispatch") && !d.endsWith("Ref") && !d.endsWith(".current");
          });

        // Find the dependency array line
        let depLineIndex = lineIndex;
        let depLine = lines[depLineIndex];

        // Look for the dependency array (it might be on the same or following lines)
        while (depLineIndex < lines.length && !depLine.includes("]")) {
          depLineIndex++;
          depLine = lines[depLineIndex];
        }

        if (depLine && depLine.includes("[") && depLine.includes("]")) {
          // Extract existing dependencies
          const existingDepsMatch = depLine.match(/\[([^\]]*)\]/);
          const existingDeps = existingDepsMatch?.[1]
            ? existingDepsMatch[1]
                .split(",")
                .map((d) => d.trim())
                .filter(Boolean)
            : [];

          // Add missing dependencies
          const allDeps = [...new Set([...existingDeps, ...missingDeps])];

          // Replace the dependency array
          const newDepArray = `[${allDeps.join(", ")}]`;
          lines[depLineIndex] = depLine.replace(/\[[^\]]*\]/, newDepArray);
          this.stats.hookDeps++;
        }
      }

      fixed = lines.join("\n");
    }

    return fixed;
  }

  // Fix missing display names
  fixDisplayNames(content, messages) {
    let fixed = content;
    const displayNameWarnings = messages.filter((m) => m.ruleId === "react/display-name");

    for (const warning of displayNameWarnings) {
      const lines = fixed.split("\n");
      const lineIndex = warning.line - 1;
      const line = lines[lineIndex];

      // Look for memo or forwardRef patterns
      if (line.includes("memo(") || line.includes("forwardRef(")) {
        // Find the component name from context
        let componentName = "Component";

        // Check previous lines for variable assignment
        for (let i = lineIndex; i >= Math.max(0, lineIndex - 5); i--) {
          const prevLine = lines[i];
          const varMatch = prevLine.match(/(?:const|let|var)\s+(\w+)\s*=/);
          if (varMatch) {
            componentName = varMatch[1];
            break;
          }
        }

        // Add displayName after the component definition
        let insertIndex = lineIndex + 1;
        while (insertIndex < lines.length && !lines[insertIndex].includes(");")) {
          insertIndex++;
        }

        if (insertIndex < lines.length) {
          lines.splice(insertIndex + 1, 0, `${componentName}.displayName = '${componentName}';`);
          this.stats.displayNames++;
        }
      }

      fixed = lines.join("\n");
    }

    return fixed;
  }

  async processFile(filePath, messages) {
    if (messages.length === 0) return false;

    const content = fs.readFileSync(filePath, "utf8");
    let fixed = content;

    // Apply fixes in order
    fixed = this.fixUnusedVarsAndImports(fixed, messages);
    fixed = this.fixHookDependencies(fixed, messages);
    fixed = this.fixDisplayNames(fixed, messages);

    if (fixed !== content) {
      fs.writeFileSync(filePath, fixed);
      return true;
    }

    return false;
  }

  async run() {
    this.log("🔍 Collecting ESLint warnings...", "cyan");

    const results = await this.collectWarnings();
    const filesToFix = results.filter((r) => r.messages.length > 0);

    this.log(`\n📊 Found ${filesToFix.length} files with warnings`, "yellow");

    for (const file of filesToFix) {
      const relativePath = path.relative(process.cwd(), file.filePath);
      const warningCount = file.messages.length;

      this.log(`\n📝 Processing: ${relativePath} (${warningCount} warnings)`, "blue");

      const fixed = await this.processFile(file.filePath, file.messages);

      if (fixed) {
        this.stats.filesProcessed++;
        this.stats.totalFixed += warningCount;
        this.log(`   ✅ Fixed warnings in ${relativePath}`, "green");
      } else {
        this.log(`   ⚠️  No automatic fixes applied to ${relativePath}`, "yellow");
      }
    }

    // Print summary
    this.log("\n" + "=".repeat(60), "cyan");
    this.log("📈 Fix Summary:", "cyan");
    this.log(`   Files processed: ${this.stats.filesProcessed}`, "green");
    this.log(`   Unused imports removed: ${this.stats.unusedImports}`, "green");
    this.log(`   Unused variables fixed: ${this.stats.unusedVars}`, "green");
    this.log(`   Hook dependencies fixed: ${this.stats.hookDeps}`, "green");
    this.log(`   Display names added: ${this.stats.displayNames}`, "green");
    this.log(`   Total warnings addressed: ${this.stats.totalFixed}`, "green");
    this.log("=".repeat(60), "cyan");

    // Run ESLint again to check remaining warnings
    this.log("\n🔍 Running ESLint to check remaining warnings...", "cyan");
    try {
      await execAsync("npx eslint src --ext .ts,.tsx");
      this.log("✨ All ESLint warnings have been fixed!", "green");
    } catch (error) {
      this.log("⚠️  Some warnings may require manual review", "yellow");
      this.log('Run "npm run lint" to see remaining warnings', "yellow");
    }
  }
}

// Run the fixer
const fixer = new ESLintFixer();
fixer.run().catch((error) => {
  console.error("Error running ESLint fixer:", error);
  process.exit(1);
});
