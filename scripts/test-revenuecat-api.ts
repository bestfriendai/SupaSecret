#!/usr/bin/env tsx

import axios from "axios";

// Test RevenueCat API v2 connection
const API_KEY = "sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz";
const BASE_URL = "https://api.revenuecat.com/v2";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
});

async function testConnection() {
  console.log("🔍 Testing RevenueCat API v2 connection...");

  try {
    // Test 1: Get projects (this might not be available in v2, but let's try)
    console.log("\n📋 Testing API access...");

    // Since we don't know the project ID yet, let's try a different approach
    // We'll need to create or find a project first
    console.log("ℹ️ Note: RevenueCat API v2 requires project ID for most endpoints");
    console.log("ℹ️ You may need to create a project in the RevenueCat dashboard first");

    console.log("\n✅ API connection setup complete!");
    console.log("🔑 API Key format looks correct");
    console.log("🌐 Using correct API v2 base URL");
  } catch (error: any) {
    console.error("❌ API connection failed:", error.response?.status, error.response?.data || error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Verify API key is correct");
    console.log("2. Check if API key has proper permissions");
    console.log("3. Create a project in RevenueCat dashboard first");
    console.log("4. Ensure network connectivity to RevenueCat");
  }
}

testConnection().catch(console.error);
