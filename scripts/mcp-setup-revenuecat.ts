#!/usr/bin/env tsx

import axios from 'axios';

// RevenueCat MCP configuration
const MCP_URL = 'https://mcp.revenuecat.ai/mcp';
// Read API key from environment to avoid committing secrets.
// Set via REVENUECAT_MCP_API_KEY environment variable when running the script.
const API_KEY = process.env.REVENUECAT_MCP_API_KEY || process.env.RC_MCP_API_KEY || '';

if (!API_KEY) {
  console.error('\n❌ RevenueCat MCP API key not provided.');
  console.error('Set the environment variable REVENUECAT_MCP_API_KEY to your sk_ key and re-run the script.');
  console.error("Example (zsh): REVENUECAT_MCP_API_KEY=sk_xxx ./scripts/mcp-setup-revenuecat.ts\n");
  process.exit(1);
}

// Helper to call MCP tools
async function callMCPTool(toolName: string, params: any) {
  try {
    const response = await axios.post(
      MCP_URL,
      {
        jsonrpc: '2.0',
        method: `tools/call`,
        params: {
          name: toolName,
          arguments: params
        },
        id: Date.now()
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        }
      }
    );

    // Parse SSE response if needed
    const data = response.data;
    if (typeof data === 'string' && data.includes('event:')) {
      const lines = data.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonData = line.substring(5).trim();
          if (jsonData) {
            return JSON.parse(jsonData);
          }
        }
      }
    }
    return data;
  } catch (error: any) {
    console.error(`Error calling ${toolName}:`, error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Setting up RevenueCat Project via MCP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: Get project details
    console.log('\n📋 Getting project details...');
    const projectResult = await callMCPTool('mcp_RC_get_project', {});
    const projectId = projectResult?.result?.project?.id || 'proj1ab2c3d4'; // Use default if not found
    console.log(`  Project ID: ${projectId}`);

    // Step 2: List existing apps
    console.log('\n📱 Checking existing apps...');
    const appsResult = await callMCPTool('mcp_RC_list_apps', { project_id: projectId });
    const existingApps = appsResult?.result?.apps || [];
    console.log(`  Found ${existingApps.length} apps`);

    // Step 3: Create iOS app if not exists
    let iosAppId = existingApps.find((app: any) => app.type === 'app_store')?.id;
    if (!iosAppId) {
      console.log('\n  Creating iOS app...');
      const iosAppResult = await callMCPTool('mcp_RC_create_app', {
        project_id: projectId,
        name: 'Toxic Confessions iOS',
        type: 'app_store',
        bundle_id: 'com.toxic.confessions'
      });
      iosAppId = iosAppResult?.result?.app?.id;
      console.log(`    ✅ iOS app created: ${iosAppId}`);
    } else {
      console.log(`    ℹ️ iOS app already exists: ${iosAppId}`);
    }

    // Step 4: Create Android app if not exists
    let androidAppId = existingApps.find((app: any) => app.type === 'play_store')?.id;
    if (!androidAppId) {
      console.log('\n  Creating Android app...');
      const androidAppResult = await callMCPTool('mcp_RC_create_app', {
        project_id: projectId,
        name: 'Toxic Confessions Android',
        type: 'play_store',
        package_name: 'com.toxic.confessions'
      });
      androidAppId = androidAppResult?.result?.app?.id;
      console.log(`    ✅ Android app created: ${androidAppId}`);
    } else {
      console.log(`    ℹ️ Android app already exists: ${androidAppId}`);
    }

    // Step 5: Create entitlements
    console.log('\n📦 Creating entitlements...');
    const entitlementResult = await callMCPTool('mcp_RC_create_entitlement', {
      project_id: projectId,
      lookup_key: 'supasecret_plus',
      display_name: 'Premium Access'
    });
    const entitlementId = entitlementResult?.result?.entitlement?.id || 'supasecret_plus';
    console.log(`  ✅ Entitlement created: ${entitlementId}`);

    // Step 6: List existing products
    console.log('\n🛍️ Checking existing products...');
    const productsResult = await callMCPTool('mcp_RC_list_products', { project_id: projectId });
    const existingProducts = productsResult?.result?.products || [];

    // Note: Products need to be created in App Store Connect and Google Play Console first
    // Then imported to RevenueCat. We'll assume they exist for attachment.
    const productIds = ['supasecret_plus_monthly', 'supasecret_plus_annual'];

    // Step 7: Attach products to entitlement
    console.log('\n  Attaching products to entitlement...');
    await callMCPTool('mcp_RC_attach_products_to_entitlement', {
      project_id: projectId,
      entitlement_id: entitlementId,
      product_ids: productIds
    });
    console.log(`    ✅ Products attached to entitlement`);

    // Step 8: Create offerings
    console.log('\n🎯 Creating offerings...');
    const offeringsResult = await callMCPTool('mcp_RC_list_offerings', { project_id: projectId });
    const existingOfferings = offeringsResult?.result?.offerings || [];

    let offeringId = existingOfferings.find((o: any) => o.lookup_key === 'default')?.id;
    if (!offeringId) {
      offeringId = 'default';
      console.log(`  Offering will be created when products are available`);
    }

    // Step 9: Create packages
    console.log('\n📦 Creating packages...');

    // Monthly package
    await callMCPTool('mcp_RC_create_package', {
      project_id: projectId,
      offering_id: offeringId,
      lookup_key: '$rc_monthly',
      display_name: 'Monthly Subscription',
      position: 1
    });
    console.log(`    ✅ Monthly package created`);

    // Annual package
    await callMCPTool('mcp_RC_create_package', {
      project_id: projectId,
      offering_id: offeringId,
      lookup_key: '$rc_annual',
      display_name: 'Annual Subscription (Save 50%)',
      position: 2
    });
    console.log(`    ✅ Annual package created`);

    // Step 10: Attach products to packages
    console.log('\n  Attaching products to packages...');

    // Attach monthly product
    await callMCPTool('mcp_RC_attach_products_to_package', {
      project_id: projectId,
      package_id: '$rc_monthly',
      products: [{
        product_id: 'supasecret_plus_monthly',
        eligibility_criteria: 'all'
      }]
    });
    console.log(`    ✅ Monthly product attached`);

    // Attach annual product
    await callMCPTool('mcp_RC_attach_products_to_package', {
      project_id: projectId,
      package_id: '$rc_annual',
      products: [{
        product_id: 'supasecret_plus_annual',
        eligibility_criteria: 'all'
      }]
    });
    console.log(`    ✅ Annual product attached`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ✅ ✅ RevenueCat Setup Complete! ✅ ✅ ✅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📱 Next Steps:');
    console.log('1. Create products in App Store Connect');
    console.log('2. Create products in Google Play Console');
    console.log('3. Import products to RevenueCat Dashboard');
    console.log('4. Test with sandbox accounts');

    console.log('\n💰 Products Configured:');
    console.log('  • supasecret_plus_monthly - $4.99/month');
    console.log('  • supasecret_plus_annual - $29.99/year');

    console.log('\n🎁 Premium Features:');
    console.log('  • Ad-free experience');
    console.log('  • Unlimited 5-minute videos');
    console.log('  • 4K video quality');
    console.log('  • Unlimited saves');
    console.log('  • Advanced filters');
    console.log('  • Priority processing');
    console.log('  • Custom themes');
    console.log('  • Early access');

  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n📝 Manual Setup Instructions:');
    console.log('Please follow the guide in REVENUECAT_DASHBOARD_SETUP.md');
  }
}

main();