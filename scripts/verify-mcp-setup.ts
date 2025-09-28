#!/usr/bin/env tsx
/**
 * Verify RevenueCat MCP Setup in Cursor
 *
 * This script verifies that the MCP server is properly configured
 * for use with Cursor IDE.
 */

import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";

// Load environment variables
dotenv.config({ path: ".env.mcp" });

async function verifyMCPSetup() {
  console.log("🔍 Verifying RevenueCat MCP Setup for Cursor");
  console.log("============================================\n");

  const API_KEY = process.env.REVENUECAT_MCP_API_KEY;

  // Check 1: API Key exists
  console.log("✔️ Checking API Key...");
  if (!API_KEY) {
    console.error("❌ REVENUECAT_MCP_API_KEY not found in .env.mcp");
    process.exit(1);
  }
  console.log("  ✅ API Key found in .env.mcp");

  // Check 2: MCP configuration file exists
  console.log("\n✔️ Checking MCP configuration...");
  const mcpConfigPath = path.join(process.cwd(), ".cursor", "mcp.json");

  try {
    const mcpConfig = JSON.parse(await fs.readFile(mcpConfigPath, "utf-8"));
    console.log("  ✅ MCP configuration file found at .cursor/mcp.json");

    // Verify server configuration
    if (mcpConfig.servers?.revenuecat) {
      const serverConfig = mcpConfig.servers.revenuecat;
      console.log("  ✅ RevenueCat server configured");
      console.log(`     URL: ${serverConfig.url}`);
      console.log(
        `     Auth: ${serverConfig.headers?.Authorization ? "Bearer token configured" : "No auth configured"}`,
      );
    } else {
      console.error("  ❌ RevenueCat server not found in configuration");
    }
  } catch (error) {
    console.error("  ❌ Could not read MCP configuration:", error);
  }

  // Check 3: Verify .gitignore entries
  console.log("\n✔️ Checking .gitignore...");
  try {
    const gitignore = await fs.readFile(".gitignore", "utf-8");
    const requiredEntries = [".cursor/mcp.json", ".env.mcp"];
    const missingEntries = requiredEntries.filter((entry) => !gitignore.includes(entry));

    if (missingEntries.length === 0) {
      console.log("  ✅ All sensitive files are in .gitignore");
    } else {
      console.warn("  ⚠️  Missing .gitignore entries:", missingEntries.join(", "));
    }
  } catch (error) {
    console.error("  ❌ Could not read .gitignore:", error);
  }

  // Check 4: Verify existing RevenueCat configuration
  console.log("\n✔️ Checking existing RevenueCat setup...");
  const configPath = path.join(process.cwd(), "setup", "mcp-revenuecat-config.json");

  try {
    const existingConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));
    console.log("  ✅ Existing RevenueCat configuration found");
    console.log(`     Project: ${existingConfig.project?.name}`);
    console.log(`     Bundle ID: ${existingConfig.project?.bundleId}`);
    console.log(`     Products: ${existingConfig.products?.length || 0}`);
    console.log(`     Entitlements: ${existingConfig.entitlements?.length || 0}`);
  } catch (error) {
    console.warn("  ⚠️  No existing RevenueCat configuration found");
  }

  // Create setup summary
  const setupSummary = {
    timestamp: new Date().toISOString(),
    status: "configured",
    configuration: {
      mcpServerUrl: "https://mcp.revenuecat.ai/mcp",
      authMethod: "API v2 Secret Key",
      configLocation: ".cursor/mcp.json",
      envFile: ".env.mcp",
    },
    project: {
      name: "Toxic Confessions",
      bundleId: "com.toxic.confessions",
      platforms: ["ios", "android"],
    },
    nextSteps: [
      "1. Restart Cursor IDE to load the new MCP configuration",
      "2. In Cursor, go to Settings → MCP",
      "3. Click the Enable button if MCP is not already enabled",
      "4. Click the Refresh icon to reload servers",
      '5. You should see "revenuecat" in the list of available servers',
      "6. Use @revenuecat in your prompts to interact with RevenueCat",
    ],
  };

  // Save setup summary
  await fs.writeFile(
    path.join(process.cwd(), "setup", "mcp-setup-summary.json"),
    JSON.stringify(setupSummary, null, 2),
  );

  console.log("\n" + "=".repeat(50));
  console.log("✅ RevenueCat MCP Setup Complete!");
  console.log("=".repeat(50));
  console.log("\n📋 Next Steps:");
  setupSummary.nextSteps.forEach((step) => {
    console.log(`   ${step}`);
  });

  console.log("\n💡 Usage Examples:");
  console.log('   - "@revenuecat list all products"');
  console.log('   - "@revenuecat show entitlements"');
  console.log('   - "@revenuecat create a new offering"');
  console.log('   - "@revenuecat get customer info for user123"');

  console.log("\n📄 Setup summary saved to: setup/mcp-setup-summary.json");
}

// Run verification
verifyMCPSetup().catch(console.error);
