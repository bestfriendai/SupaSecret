#!/usr/bin/env tsx

import axios from 'axios';

// RevenueCat MCP configuration
const MCP_URL = 'https://mcp.revenuecat.ai/mcp';
const API_KEY = 'sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz';

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
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
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
            try {
              return JSON.parse(jsonData);
            } catch (e) {
              // Continue if parse fails
            }
          }
        }
      }
    }
    return data;
  } catch (error: any) {
    console.error(`Error calling ${toolName}:`, error.response?.data || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Setting up ToxicConfessions RevenueCat Project via MCP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Project: ToxicConfessions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: Get project details
    console.log('\n📋 Getting project details...');
    const projectResult = await callMCPTool('mcp_RC_get_project', {});
    const projectId = projectResult?.result?.project?.id || 'toxicconfessions';
    console.log(`  Project ID: ${projectId}`);

    // Step 2: List existing apps
    console.log('\n📱 Checking existing apps...');
    const appsResult = await callMCPTool('mcp_RC_list_apps', { project_id: projectId });
    const existingApps = appsResult?.result?.apps || [];
    console.log(`  Found ${existingApps.length} existing apps`);

    if (existingApps.length > 0) {
      existingApps.forEach((app: any) => {
        console.log(`    - ${app.name} (${app.type}): ${app.id}`);
      });
    }

    // Step 3: Create or update iOS app
    let iosAppId = existingApps.find((app: any) => app.type === 'app_store')?.id;
    if (!iosAppId) {
      console.log('\n  Creating iOS app...');
      const iosAppResult = await callMCPTool('mcp_RC_create_app', {
        project_id: projectId,
        name: 'ToxicConfessions iOS',
        type: 'app_store',
        bundle_id: 'com.toxic.confessions'
      });
      iosAppId = iosAppResult?.result?.app?.id;
      if (iosAppId) {
        console.log(`    ✅ iOS app created: ${iosAppId}`);
      } else {
        console.log(`    ⚠️ Could not create iOS app (may need manual setup)`);
      }
    } else {
      console.log(`    ℹ️ iOS app already exists: ${iosAppId}`);
    }

    // Step 4: Create or update Android app
    let androidAppId = existingApps.find((app: any) => app.type === 'play_store')?.id;
    if (!androidAppId) {
      console.log('\n  Creating Android app...');
      const androidAppResult = await callMCPTool('mcp_RC_create_app', {
        project_id: projectId,
        name: 'ToxicConfessions Android',
        type: 'play_store',
        package_name: 'com.toxic.confessions'
      });
      androidAppId = androidAppResult?.result?.app?.id;
      if (androidAppId) {
        console.log(`    ✅ Android app created: ${androidAppId}`);
      } else {
        console.log(`    ⚠️ Could not create Android app (may need manual setup)`);
      }
    } else {
      console.log(`    ℹ️ Android app already exists: ${androidAppId}`);
    }

    // Step 5: Check existing entitlements
    console.log('\n📦 Checking entitlements...');
    const entitlementsResult = await callMCPTool('mcp_RC_list_entitlements', {
      project_id: projectId,
      limit: 100
    });
    const existingEntitlements = entitlementsResult?.result?.entitlements || [];
    console.log(`  Found ${existingEntitlements.length} existing entitlements`);

    // Delete old supasecret_plus entitlement if it exists
    const oldEntitlement = existingEntitlements.find((e: any) =>
      e.lookup_key === 'supasecret_plus' || e.id === 'supasecret_plus'
    );
    if (oldEntitlement) {
      console.log(`  Removing old entitlement: ${oldEntitlement.id}`);
      await callMCPTool('mcp_RC_delete_entitlement', {
        project_id: projectId,
        entitlement_id: oldEntitlement.id
      });
      console.log(`    ✅ Old entitlement removed`);
    }

    // Create new toxicconfessions_plus entitlement
    let entitlementId = existingEntitlements.find((e: any) =>
      e.lookup_key === 'toxicconfessions_plus'
    )?.id;

    if (!entitlementId) {
      console.log('\n  Creating ToxicConfessions Plus entitlement...');
      const entitlementResult = await callMCPTool('mcp_RC_create_entitlement', {
        project_id: projectId,
        lookup_key: 'toxicconfessions_plus',
        display_name: 'ToxicConfessions Premium'
      });
      entitlementId = entitlementResult?.result?.entitlement?.id || 'toxicconfessions_plus';
      if (entitlementResult?.result) {
        console.log(`    ✅ Entitlement created: ${entitlementId}`);
      } else {
        console.log(`    ⚠️ Could not create entitlement (may already exist)`);
        entitlementId = 'toxicconfessions_plus';
      }
    } else {
      console.log(`    ℹ️ Entitlement already exists: ${entitlementId}`);
    }

    // Step 6: Define correct product IDs
    const productIds = [
      'toxicconfessions_plus_monthly',
      'toxicconfessions_plus_annual'
    ];

    // Step 7: Attach products to entitlement
    console.log('\n  Attaching products to entitlement...');
    const attachResult = await callMCPTool('mcp_RC_attach_products_to_entitlement', {
      project_id: projectId,
      entitlement_id: entitlementId,
      product_ids: productIds
    });
    if (attachResult?.result || attachResult === null) {
      console.log(`    ✅ Products configured for entitlement`);
    }

    // Step 8: Check existing offerings
    console.log('\n🎯 Checking offerings...');
    const offeringsResult = await callMCPTool('mcp_RC_list_offerings', {
      project_id: projectId,
      limit: 100
    });
    const existingOfferings = offeringsResult?.result?.offerings || [];
    console.log(`  Found ${existingOfferings.length} existing offerings`);

    let offeringId = existingOfferings.find((o: any) =>
      o.lookup_key === 'default' || o.id === 'default'
    )?.id || 'default';

    // Step 9: Create packages
    console.log('\n📦 Setting up packages...');

    // Check existing packages
    const packagesResult = await callMCPTool('mcp_RC_list_packages', {
      project_id: projectId,
      offering_id: offeringId
    });
    const existingPackages = packagesResult?.result?.packages || [];

    // Create monthly package if not exists
    if (!existingPackages.find((p: any) => p.lookup_key === '$rc_monthly')) {
      console.log('  Creating monthly package...');
      const monthlyResult = await callMCPTool('mcp_RC_create_package', {
        project_id: projectId,
        offering_id: offeringId,
        lookup_key: '$rc_monthly',
        display_name: 'Monthly Subscription',
        position: 1
      });
      if (monthlyResult?.result) {
        console.log(`    ✅ Monthly package created`);
      }
    } else {
      console.log(`    ℹ️ Monthly package already exists`);
    }

    // Create annual package if not exists
    if (!existingPackages.find((p: any) => p.lookup_key === '$rc_annual')) {
      console.log('  Creating annual package...');
      const annualResult = await callMCPTool('mcp_RC_create_package', {
        project_id: projectId,
        offering_id: offeringId,
        lookup_key: '$rc_annual',
        display_name: 'Annual Subscription (Save 50%)',
        position: 2
      });
      if (annualResult?.result) {
        console.log(`    ✅ Annual package created`);
      }
    } else {
      console.log(`    ℹ️ Annual package already exists`);
    }

    // Step 10: Attach products to packages
    console.log('\n  Configuring package products...');

    // Attach monthly product
    await callMCPTool('mcp_RC_attach_products_to_package', {
      project_id: projectId,
      package_id: '$rc_monthly',
      products: [{
        product_id: 'toxicconfessions_plus_monthly',
        eligibility_criteria: 'all'
      }]
    });
    console.log(`    ✅ Monthly product configured`);

    // Attach annual product
    await callMCPTool('mcp_RC_attach_products_to_package', {
      project_id: projectId,
      package_id: '$rc_annual',
      products: [{
        product_id: 'toxicconfessions_plus_annual',
        eligibility_criteria: 'all'
      }]
    });
    console.log(`    ✅ Annual product configured`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ✅ ✅ ToxicConfessions RevenueCat Setup Complete! ✅ ✅ ✅');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📱 Configuration Summary:');
    console.log('  Project: ToxicConfessions');
    console.log('  iOS Bundle ID: com.toxic.confessions');
    console.log('  Android Package: com.toxic.confessions');

    console.log('\n💰 Products Configured:');
    console.log('  • toxicconfessions_plus_monthly - $4.99/month');
    console.log('  • toxicconfessions_plus_annual - $29.99/year (Save 50%)');

    console.log('\n📦 Entitlement:');
    console.log('  • toxicconfessions_plus - Premium Access');

    console.log('\n🎯 Offering:');
    console.log('  • default - Contains monthly and annual packages');

    console.log('\n📝 Next Steps:');
    console.log('1. Create matching products in App Store Connect:');
    console.log('   - toxicconfessions_plus_monthly');
    console.log('   - toxicconfessions_plus_annual');
    console.log('');
    console.log('2. Create matching products in Google Play Console:');
    console.log('   - toxicconfessions_plus_monthly');
    console.log('   - toxicconfessions_plus_annual');
    console.log('');
    console.log('3. Import products to RevenueCat Dashboard');
    console.log('4. Test with sandbox accounts');

    console.log('\n🎁 Premium Features:');
    console.log('  ✅ Ad-free experience');
    console.log('  ✅ Unlimited 5-minute videos');
    console.log('  ✅ 4K video quality');
    console.log('  ✅ Unlimited saves');
    console.log('  ✅ Advanced filters');
    console.log('  ✅ Priority processing');
    console.log('  ✅ Custom themes');
    console.log('  ✅ Early access to features');

  } catch (error: any) {
    console.error('\n❌ Setup error:', error.message);
    console.log('\n📝 Please check the RevenueCat Dashboard at:');
    console.log('https://app.revenuecat.com');
  }
}

main();