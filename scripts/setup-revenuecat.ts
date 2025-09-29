#!/usr/bin/env tsx

import axios from "axios";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Load environment variables
dotenv.config();

// RevenueCat Management API configuration
const REVENUECAT_API_KEY = "sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz";
const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";

const api = axios.create({
  baseURL: REVENUECAT_API_BASE,
  headers: {
    Authorization: `Bearer ${REVENUECAT_API_KEY}`,
    "Content-Type": "application/json",
  },
});

// Configuration for Toxic Confessions
const APP_CONFIG = {
  name: "Toxic Confessions",
  bundle_id_ios: "com.toxic.confessions",
  bundle_id_android: "com.toxic.confessions",
  ios_api_key: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android_api_key: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
};

const ENTITLEMENTS = [
  {
    id: "supasecret_plus",
    lookup_key: "premium_access",
    display_name: "Premium Access",
    description: "Full access to all premium features",
  },
];

const PRODUCTS = [
  {
    id: "supasecret_plus_monthly",
    display_name: "Toxic Confessions Plus Monthly",
    type: "subscription",
    duration: "P1M",
    price_usd: 4.99,
    entitlements: ["supasecret_plus"],
  },
  {
    id: "supasecret_plus_annual",
    display_name: "Toxic Confessions Plus Annual",
    type: "subscription",
    duration: "P1Y",
    price_usd: 29.99,
    entitlements: ["supasecret_plus"],
    is_popular: true,
  },
];

const OFFERINGS = [
  {
    id: "default",
    display_name: "Toxic Confessions Plus",
    packages: [
      {
        id: "monthly",
        product_id: "supasecret_plus_monthly",
      },
      {
        id: "annual",
        product_id: "supasecret_plus_annual",
        is_recommended: true,
      },
    ],
  },
];

async function createApp() {
  console.log("🚀 Creating RevenueCat App...");

  try {
    // Create iOS app
    const iosResponse = await api.post("/apps", {
      name: APP_CONFIG.name,
      bundle_id: APP_CONFIG.bundle_id_ios,
      platform: "ios",
      api_key: APP_CONFIG.ios_api_key,
    });
    console.log("✅ iOS app created:", iosResponse.data);

    // Create Android app
    const androidResponse = await api.post("/apps", {
      name: APP_CONFIG.name,
      bundle_id: APP_CONFIG.bundle_id_android,
      platform: "android",
      api_key: APP_CONFIG.android_api_key,
    });
    console.log("✅ Android app created:", androidResponse.data);

    return { ios: iosResponse.data, android: androidResponse.data };
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log("ℹ️ App already exists, continuing...");
      return { existing: true };
    }
    console.error("❌ Error creating app:", error.response?.data || error.message);
    throw error;
  }
}

async function createEntitlements() {
  console.log("\n📦 Creating Entitlements...");

  for (const entitlement of ENTITLEMENTS) {
    try {
      const response = await api.post(`/apps/${APP_CONFIG.bundle_id_ios}/entitlements`, entitlement);
      console.log(`✅ Created entitlement: ${entitlement.id}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`ℹ️ Entitlement ${entitlement.id} already exists`);
      } else {
        console.error(`❌ Error creating entitlement ${entitlement.id}:`, error.response?.data || error.message);
      }
    }
  }
}

async function createProducts() {
  console.log("\n🛍️ Creating Products...");

  for (const product of PRODUCTS) {
    try {
      // Create for iOS
      await api.post(`/apps/${APP_CONFIG.bundle_id_ios}/products`, {
        ...product,
        platform: "ios",
      });
      console.log(`✅ Created iOS product: ${product.id}`);

      // Create for Android
      await api.post(`/apps/${APP_CONFIG.bundle_id_android}/products`, {
        ...product,
        platform: "android",
      });
      console.log(`✅ Created Android product: ${product.id}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`ℹ️ Product ${product.id} already exists`);
      } else {
        console.error(`❌ Error creating product ${product.id}:`, error.response?.data || error.message);
      }
    }
  }
}

async function createOfferings() {
  console.log("\n🎯 Creating Offerings...");

  for (const offering of OFFERINGS) {
    try {
      const response = await api.post(`/apps/${APP_CONFIG.bundle_id_ios}/offerings`, offering);
      console.log(`✅ Created offering: ${offering.id}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`ℹ️ Offering ${offering.id} already exists`);
      } else {
        console.error(`❌ Error creating offering ${offering.id}:`, error.response?.data || error.message);
      }
    }
  }
}

async function saveConfiguration() {
  console.log("\n💾 Saving Configuration...");

  const config = {
    app: APP_CONFIG,
    entitlements: ENTITLEMENTS,
    products: PRODUCTS,
    offerings: OFFERINGS,
    created_at: new Date().toISOString(),
  };

  const configPath = join(process.cwd(), "setup", "revenuecat-config.json");
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Configuration saved to: ${configPath}`);

  return config;
}

async function generateInstructions() {
  console.log("\n📝 Generating Setup Instructions...");

  const instructions = `
# RevenueCat Setup Complete! 🎉

## Next Steps

### 1. App Store Connect (iOS)
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → In-App Purchases
3. Create a subscription group: \`toxic_confessions_plus_group\`
4. Add these products:
   - \`supasecret_plus_monthly\` - $4.99/month
   - \`supasecret_plus_annual\` - $29.99/year

### 2. Google Play Console (Android)
1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to your app → Monetization → Subscriptions
3. Create these subscriptions:
   - \`supasecret_plus_monthly\` - $4.99/month
   - \`supasecret_plus_annual\` - $29.99/year

### 3. RevenueCat Dashboard
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Connect App Store Connect integration
3. Connect Google Play Console integration
4. Import products from both stores

### 4. Testing
Run the following commands to test:
\`\`\`bash
npm run verify-revenuecat
npm start
\`\`\`

## API Keys
- iOS: ${APP_CONFIG.ios_api_key}
- Android: ${APP_CONFIG.android_api_key}
- Management API: ${REVENUECAT_API_KEY}

## Products Created
${PRODUCTS.map((p) => `- ${p.id}: ${p.display_name} ($${p.price_usd})`).join("\n")}

## Premium Features Included
- ✅ Ad-free experience
- ✅ Unlimited video recordings (up to 5 minutes)
- ✅ Higher quality video (4K)
- ✅ Unlimited saves
- ✅ Advanced filters
- ✅ Priority processing
- ✅ Custom themes
- ✅ Early access to new features

Generated: ${new Date().toISOString()}
`;

  const instructionsPath = join(process.cwd(), "setup", "revenuecat-instructions.md");
  writeFileSync(instructionsPath, instructions);
  console.log(`✅ Instructions saved to: ${instructionsPath}`);

  return instructions;
}

async function main() {
  console.log("🚀 Starting RevenueCat Setup for Toxic Confessions...\n");

  try {
    // Step 1: Create app
    await createApp();

    // Step 2: Create entitlements
    await createEntitlements();

    // Step 3: Create products
    await createProducts();

    // Step 4: Create offerings
    await createOfferings();

    // Step 5: Save configuration
    const config = await saveConfiguration();

    // Step 6: Generate instructions
    const instructions = await generateInstructions();

    console.log("\n✅ ✅ ✅ RevenueCat setup complete! ✅ ✅ ✅");
    console.log("\n📱 App Bundle IDs:");
    console.log(`   iOS: ${APP_CONFIG.bundle_id_ios}`);
    console.log(`   Android: ${APP_CONFIG.bundle_id_android}`);
    console.log("\n💰 Products:");
    PRODUCTS.forEach((p) => {
      console.log(`   - ${p.id}: $${p.price_usd}`);
    });
    console.log("\n📚 Check setup/revenuecat-instructions.md for next steps!");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

// Run the setup
main();
