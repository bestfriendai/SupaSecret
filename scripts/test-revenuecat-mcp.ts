#!/usr/bin/env tsx
/**
 * Test RevenueCat MCP Server Connection
 *
 * This script tests the RevenueCat MCP server connection and verifies
 * that the API key is working correctly.
 */

import * as dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";

// Load environment variables from .env.mcp
dotenv.config({ path: ".env.mcp" });

const API_KEY = process.env.REVENUECAT_MCP_API_KEY;
const MCP_SERVER_URL = "https://mcp.revenuecat.ai/mcp";

interface MCPRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: number;
}

interface MCPResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

async function callMCPMethod(method: string, params?: any): Promise<any> {
  const request: MCPRequest = {
    jsonrpc: "2.0",
    method,
    params: params || {},
    id: Date.now(),
  };

  console.log(`\n📡 Calling MCP method: ${method}`);

  try {
    const response = await fetch(MCP_SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MCPResponse = await response.json();

    if (data.error) {
      throw new Error(`MCP Error: ${data.error.message}`);
    }

    return data.result;
  } catch (error) {
    console.error(`❌ Error calling ${method}:`, error);
    throw error;
  }
}

async function testMCPConnection() {
  console.log("🚀 Testing RevenueCat MCP Server Connection");
  console.log("==========================================\n");

  if (!API_KEY) {
    console.error("❌ Error: REVENUECAT_MCP_API_KEY not found in .env.mcp");
    process.exit(1);
  }

  console.log("✅ API Key loaded from .env.mcp");
  console.log(`📍 MCP Server URL: ${MCP_SERVER_URL}`);

  try {
    // Test 1: List available tools
    console.log("\n📋 Test 1: Listing available MCP tools...");
    const tools = await callMCPMethod("tools/list");
    console.log(`✅ Found ${tools?.tools?.length || 0} tools available`);

    if (tools?.tools?.length > 0) {
      console.log("\nAvailable tools:");
      tools.tools.forEach((tool: any) => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });
    }

    // Test 2: Get projects list
    console.log("\n📋 Test 2: Getting projects list...");
    const projectsResult = await callMCPMethod("tools/call", {
      name: "get_projects",
      arguments: {},
    });

    if (projectsResult?.content) {
      const projects = JSON.parse(projectsResult.content[0].text);
      console.log(`✅ Found ${projects.length} project(s)`);
      projects.forEach((project: any) => {
        console.log(`  - ${project.name} (ID: ${project.id})`);
      });
    }

    // Test 3: Get specific project details
    console.log("\n📋 Test 3: Getting Toxic Confessions project details...");
    const projectResult = await callMCPMethod("tools/call", {
      name: "get_project",
      arguments: {
        projectId: "toxic-confessions", // You may need to adjust this ID
      },
    });

    if (projectResult?.content) {
      const projectData = JSON.parse(projectResult.content[0].text);
      console.log("✅ Project details retrieved successfully");
      console.log(`  - Name: ${projectData.name}`);
      console.log(`  - Created: ${projectData.created_at}`);
    }

    // Test 4: Get entitlements
    console.log("\n📋 Test 4: Getting entitlements...");
    const entitlementsResult = await callMCPMethod("tools/call", {
      name: "get_entitlements",
      arguments: {
        projectId: "toxic-confessions", // Adjust as needed
      },
    });

    if (entitlementsResult?.content) {
      const entitlements = JSON.parse(entitlementsResult.content[0].text);
      console.log(`✅ Found ${entitlements.length} entitlement(s)`);
      entitlements.forEach((ent: any) => {
        console.log(`  - ${ent.display_name} (${ent.lookup_key})`);
      });
    }

    // Save test results
    const testResults = {
      timestamp: new Date().toISOString(),
      status: "success",
      serverUrl: MCP_SERVER_URL,
      tests: {
        connection: "passed",
        toolsListing: "passed",
        projectsRetrieval: "passed",
        entitlementsRetrieval: "passed",
      },
    };

    await fs.writeFile(
      path.join(process.cwd(), "setup", "mcp-test-results.json"),
      JSON.stringify(testResults, null, 2),
    );

    console.log("\n✅ All tests passed successfully!");
    console.log("📄 Test results saved to setup/mcp-test-results.json");
    console.log("\n🎉 RevenueCat MCP Server is properly configured and working!");
  } catch (error) {
    console.error("\n❌ MCP Connection test failed:", error);

    const testResults = {
      timestamp: new Date().toISOString(),
      status: "failed",
      serverUrl: MCP_SERVER_URL,
      error: error instanceof Error ? error.message : "Unknown error",
    };

    await fs.writeFile(
      path.join(process.cwd(), "setup", "mcp-test-results.json"),
      JSON.stringify(testResults, null, 2),
    );

    process.exit(1);
  }
}

// Run the test
testMCPConnection().catch(console.error);
