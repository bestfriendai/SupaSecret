#!/usr/bin/env tsx

import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// RevenueCat REST API v1 configuration (more stable for project setup)
const API_KEY = "sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz";
const API_BASE = "https://api.revenuecat.com/v1";

// App IDs - you'll need to get these from RevenueCat dashboard first
const IOS_APP_ID = "app_vXbMfPzDzO"; // Replace with your actual iOS app ID
const ANDROID_APP_ID = "app_kNcMxQaLmP"; // Replace with your actual Android app ID

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// First, let's get or create apps
async function setupApps() {
  console.log("\n📱 Setting up Apps...");

  try {
    // List existing apps to find our project
    const appsResponse = await api.get("/apps");
    console.log("  Found apps:", appsResponse.data);

    // Extract app IDs if they exist
    const apps = appsResponse.data.apps || [];
    const iosApp = apps.find((app: any) => app.type === "app_store");
    const androidApp = apps.find((app: any) => app.type === "play_store");

    if (iosApp) {
      console.log(`  ✅ iOS App ID: ${iosApp.id}`);
    }
    if (androidApp) {
      console.log(`  ✅ Android App ID: ${androidApp.id}`);
    }

    return { iosAppId: iosApp?.id, androidAppId: androidApp?.id };
  } catch (error: any) {
    console.error("  ❌ Error getting apps:", error.response?.data || error.message);
    return { iosAppId: null, androidAppId: null };
  }
}

// Create products
async function createProducts(appId: string, platform: string) {
  console.log(`\n🛍️ Creating Products for ${platform}...`);

  const products = [
    {
      identifier: "supasecret_plus_monthly",
      display_name: "Toxic Confessions Plus Monthly",
      store_identifier: "supasecret_plus_monthly",
    },
    {
      identifier: "supasecret_plus_annual",
      display_name: "Toxic Confessions Plus Annual",
      store_identifier: "supasecret_plus_annual",
    },
  ];

  for (const product of products) {
    try {
      await api.post(`/apps/${appId}/products`, product);
      console.log(`    ✅ Created product: ${product.identifier}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`    ℹ️ Product ${product.identifier} already exists`);
      } else {
        console.error(`    ❌ Error creating product:`, error.response?.data || error.message);
      }
    }
  }
}

// Create entitlements
async function createEntitlements(appId: string) {
  console.log(`\n📦 Creating Entitlements for app ${appId}...`);

  const entitlement = {
    identifier: "supasecret_plus",
    display_name: "Premium Access",
    lookup_key: "premium_access",
  };

  try {
    await api.post(`/apps/${appId}/entitlements`, entitlement);
    console.log(`    ✅ Created entitlement: ${entitlement.identifier}`);

    // Attach products to entitlement
    const products = ["supasecret_plus_monthly", "supasecret_plus_annual"];
    for (const productId of products) {
      try {
        await api.post(`/apps/${appId}/entitlements/${entitlement.identifier}/products/${productId}`, {});
        console.log(`    ✅ Attached product ${productId} to entitlement`);
      } catch (error: any) {
        if (error.response?.status === 409) {
          console.log(`    ℹ️ Product ${productId} already attached`);
        } else {
          console.log(`    ⚠️ Could not attach product ${productId}`);
        }
      }
    }
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`    ℹ️ Entitlement ${entitlement.identifier} already exists`);
    } else {
      console.error(`    ❌ Error creating entitlement:`, error.response?.data || error.message);
    }
  }
}

// Create offerings
async function createOfferings(appId: string) {
  console.log(`\n🎯 Creating Offerings for app ${appId}...`);

  const offering = {
    identifier: "default",
    display_name: "Toxic Confessions Plus",
    lookup_key: "default",
  };

  try {
    await api.post(`/apps/${appId}/offerings`, offering);
    console.log(`    ✅ Created offering: ${offering.identifier}`);

    // Create packages
    const packages = [
      {
        identifier: "$rc_monthly",
        display_name: "Monthly Subscription",
        position: 1,
      },
      {
        identifier: "$rc_annual",
        display_name: "Annual Subscription (Save 50%)",
        position: 2,
      },
    ];

    for (const pkg of packages) {
      try {
        const productId = pkg.identifier === "$rc_monthly" ? "supasecret_plus_monthly" : "supasecret_plus_annual";
        await api.post(`/apps/${appId}/offerings/${offering.identifier}/packages`, {
          ...pkg,
          product_identifier: productId,
        });
        console.log(`    ✅ Added package ${pkg.identifier} to offering`);
      } catch (error: any) {
        if (error.response?.status === 409) {
          console.log(`    ℹ️ Package ${pkg.identifier} already exists`);
        } else {
          console.log(`    ⚠️ Could not add package ${pkg.identifier}`);
        }
      }
    }

    // Set as current offering
    try {
      await api.post(`/apps/${appId}/offerings/${offering.identifier}/override`, {
        enabled: true,
      });
      console.log(`    ✅ Set ${offering.identifier} as current offering`);
    } catch (error: any) {
      console.log(`    ℹ️ Could not set as current offering`);
    }
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log(`    ℹ️ Offering ${offering.identifier} already exists`);
    } else {
      console.error(`    ❌ Error creating offering:`, error.response?.data || error.message);
    }
  }
}

// Main setup function
async function main() {
  console.log("🚀 Setting up RevenueCat Project: Toxic Confessions");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Step 1: Get app IDs
    const { iosAppId, androidAppId } = await setupApps();

    if (!iosAppId && !androidAppId) {
      console.log("\n⚠️ No apps found in RevenueCat project.");
      console.log("\n📝 Please follow these steps:");
      console.log("1. Go to https://app.revenuecat.com");
      console.log('2. Create a new project called "Toxic Confessions"');
      console.log("3. Add iOS app with bundle ID: com.toxic.confessions");
      console.log("4. Add Android app with package: com.toxic.confessions");
      console.log("5. Copy the app IDs and update this script");
      console.log("6. Run this script again");
      return;
    }

    // Step 2: Create products for each platform
    if (iosAppId) {
      await createProducts(iosAppId, "iOS");
      await createEntitlements(iosAppId);
      await createOfferings(iosAppId);
    }

    if (androidAppId) {
      await createProducts(androidAppId, "Android");
      await createEntitlements(androidAppId);
      await createOfferings(androidAppId);
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ✅ ✅ RevenueCat Setup Complete! ✅ ✅ ✅");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("\n📱 Next Steps:");
    console.log("1. Create products in App Store Connect:");
    console.log("   • supasecret_plus_monthly ($4.99/month)");
    console.log("   • supasecret_plus_annual ($29.99/year)");
    console.log("");
    console.log("2. Create products in Google Play Console:");
    console.log("   • supasecret_plus_monthly ($4.99/month)");
    console.log("   • supasecret_plus_annual ($29.99/year)");
    console.log("");
    console.log("3. Import products in RevenueCat Dashboard");
    console.log("4. Test with sandbox accounts");

    console.log("\n🎁 Premium Features Unlocked:");
    console.log("  • Ad-free experience");
    console.log("  • Unlimited 5-minute videos");
    console.log("  • 4K video quality");
    console.log("  • Unlimited saves");
    console.log("  • Advanced filters");
    console.log("  • Priority processing");
    console.log("  • Custom themes");
    console.log("  • Early access");
  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message);
    console.error("\nPlease check your API key and try again.");
    process.exit(1);
  }
}

// Run the setup
main();
