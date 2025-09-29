#!/usr/bin/env tsx

/**
 * RevenueCat Complete Setup Script
 *
 * This script helps configure RevenueCat for production by:
 * 1. Validating environment variables
 * 2. Checking API key validity
 * 3. Providing step-by-step instructions
 * 4. Generating configuration files
 */

import * as fs from "fs";
import * as path from "path";

interface ProductConfig {
  identifier: string;
  name: string;
  type: "subscription";
  price: number;
  duration: "monthly" | "annual";
  storeProductId: {
    ios: string;
    android: string;
  };
}

interface RevenueCatConfig {
  projectName: string;
  bundleId: string;
  packageName: string;
  products: ProductConfig[];
  entitlement: string;
  offering: string;
}

const CONFIG: RevenueCatConfig = {
  projectName: "Toxic Confessions",
  bundleId: "com.toxic.confessions",
  packageName: "com.toxic.confessions",
  products: [
    {
      identifier: "monthly",
      name: "Toxic Confessions Plus Monthly",
      type: "subscription",
      price: 4.99,
      duration: "monthly",
      storeProductId: {
        ios: "com.toxic.confessions.monthly",
        android: "com.toxic.confessions.monthly",
      },
    },
    {
      identifier: "annual",
      name: "Toxic Confessions Plus Annual",
      type: "subscription",
      price: 29.99,
      duration: "annual",
      storeProductId: {
        ios: "com.toxic.confessions.annual",
        android: "com.toxic.confessions.annual",
      },
    },
  ],
  entitlement: "premium",
  offering: "default",
};

function printHeader(title: string) {
  console.log("\n" + "=".repeat(70));
  console.log(title.toUpperCase().padStart((70 + title.length) / 2));
  console.log("=".repeat(70) + "\n");
}

function printSection(title: string) {
  console.log("\n" + "-".repeat(70));
  console.log(`  ${title}`);
  console.log("-".repeat(70));
}

function printSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function printWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

function printError(message: string) {
  console.log(`❌ ${message}`);
}

function printInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

function checkEnvironmentVariables(): { ios: string | undefined; android: string | undefined } {
  printSection("Step 1: Environment Variables Check");

  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

  if (iosKey && iosKey !== "sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz") {
    printSuccess(`iOS API Key found: ${iosKey.substring(0, 15)}...`);
  } else {
    printWarning("iOS API Key not configured or using placeholder");
    printInfo("Get your iOS API key from: https://app.revenuecat.com/projects");
  }

  if (androidKey && androidKey !== "sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz") {
    printSuccess(`Android API Key found: ${androidKey.substring(0, 15)}...`);
  } else {
    printWarning("Android API Key not configured or using placeholder");
    printInfo("Get your Android API key from: https://app.revenuecat.com/projects");
  }

  if (iosKey === androidKey && iosKey) {
    printError("iOS and Android keys are identical - they should be platform-specific!");
  }

  return { ios: iosKey, android: androidKey };
}

function generateAppStoreConnectInstructions() {
  printSection("Step 2: App Store Connect Configuration");

  console.log("\n📱 iOS Setup (App Store Connect):");
  console.log("   https://appstoreconnect.apple.com\n");

  console.log("1. Navigate to: My Apps → Toxic Confessions → In-App Purchases");
  console.log("2. Create a new Subscription Group (if not exists):");
  console.log('   - Reference Name: "Toxic Confessions Plus"');
  console.log('   - Group ID: "toxic_confessions_plus"\n');

  CONFIG.products.forEach((product, index) => {
    console.log(`${index + 1}. Create ${product.duration} subscription:`);
    console.log(`   - Type: Auto-Renewable Subscription`);
    console.log(`   - Product ID: ${product.storeProductId.ios}`);
    console.log(`   - Reference Name: ${product.name}`);
    console.log(`   - Duration: ${product.duration === "monthly" ? "1 Month" : "1 Year"}`);
    console.log(`   - Price: $${product.price.toFixed(2)} USD`);
    console.log(`   - Subscription Group: toxic_confessions_plus`);
    console.log("");
  });

  printInfo("Remember to add localized descriptions and review information!");
  printInfo("Products must be approved before they can be used in production.");
}

function generatePlayConsoleInstructions() {
  printSection("Step 3: Google Play Console Configuration");

  console.log("\n🤖 Android Setup (Google Play Console):");
  console.log("   https://play.google.com/console\n");

  console.log("1. Navigate to: Your App → Monetization → Subscriptions → Products");
  console.log('2. Click "Create subscription"\n');

  CONFIG.products.forEach((product, index) => {
    console.log(`${index + 1}. Create ${product.duration} subscription:`);
    console.log(`   - Product ID: ${product.storeProductId.android}`);
    console.log(`   - Name: ${product.name}`);
    console.log(`   - Description: Premium ${product.duration} subscription for Toxic Confessions`);
    console.log(`   - Billing Period: ${product.duration === "monthly" ? "Monthly" : "Yearly"}`);
    console.log(`   - Default Price: $${product.price.toFixed(2)} USD`);
    console.log(`   - Grace Period: 3 days (recommended)`);
    console.log(`   - Free Trial: Optional (7 days recommended)`);
    console.log("");
  });

  printInfo("Set up pricing for all target countries!");
  printInfo("Activate subscriptions after configuration.");
}

function generateRevenueCatInstructions(apiKeys: { ios: string | undefined; android: string | undefined }) {
  printSection("Step 4: RevenueCat Dashboard Configuration");

  console.log("\n🔑 RevenueCat Setup:");
  console.log("   https://app.revenuecat.com\n");

  if (!apiKeys.ios || !apiKeys.android || apiKeys.ios === apiKeys.android) {
    printWarning("PREREQUISITE: Get platform-specific API keys first!");
    console.log("\nTo get API keys:");
    console.log("1. Go to RevenueCat Dashboard → Projects");
    console.log('2. Click on your project (or create new: "Toxic Confessions")');
    console.log('3. Click "Settings" → "API Keys"');
    console.log('4. iOS App → Copy "Public SDK Key" (starts with "appl_")');
    console.log('5. Android App → Copy "Public SDK Key" (starts with "goog_")');
    console.log("6. Update your .env file:\n");
    console.log(`   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_YOUR_IOS_KEY_HERE`);
    console.log(`   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_YOUR_ANDROID_KEY_HERE\n`);
  }

  console.log("A. Add Apps to Project:");
  console.log("   1. iOS App:");
  console.log(`      - Bundle ID: ${CONFIG.bundleId}`);
  console.log("      - App Store Connect Shared Secret: (from App Store Connect)");
  console.log("   2. Android App:");
  console.log(`      - Package Name: ${CONFIG.packageName}`);
  console.log("      - Service Account JSON: (from Play Console)\n");

  console.log("B. Import Products:");
  console.log('   1. Go to "Products" tab → Click "New"');
  CONFIG.products.forEach((product) => {
    console.log(`   2. Add product: ${product.storeProductId.ios}`);
    console.log(`      - iOS: Select "${product.storeProductId.ios}" from dropdown`);
    console.log(`      - Android: Select "${product.storeProductId.android}" from dropdown`);
  });
  console.log("");

  console.log("C. Create Entitlement:");
  console.log('   1. Go to "Entitlements" tab → Click "New"');
  console.log(`   2. Identifier: ${CONFIG.entitlement}`);
  console.log("   3. Attach all products:");
  CONFIG.products.forEach((product) => {
    console.log(`      - ${product.storeProductId.ios}`);
  });
  console.log("");

  console.log("D. Create Offering:");
  console.log('   1. Go to "Offerings" tab → Click "New"');
  console.log(`   2. Identifier: ${CONFIG.offering}`);
  console.log('   3. Set as "Current Offering" ✅');
  console.log("   4. Add Packages:");
  CONFIG.products.forEach((product) => {
    console.log(`      - Package ID: $rc_${product.identifier}`);
    console.log(`        Product: ${product.storeProductId.ios}`);
  });
  console.log("");
}

function generateTestingInstructions() {
  printSection("Step 5: Testing Configuration");

  console.log("\n🧪 Test Your Setup:\n");

  console.log("iOS Testing (Sandbox):");
  console.log("1. Create sandbox tester in App Store Connect");
  console.log("2. Sign out of App Store on device");
  console.log("3. Run app: npx expo run:ios");
  console.log("4. Attempt purchase → sign in with sandbox account");
  console.log("5. Verify purchase completes and entitlement activates\n");

  console.log("Android Testing:");
  console.log("1. Add license testing account in Play Console");
  console.log("2. Install app via Internal Testing track");
  console.log("3. Run app: npx expo run:android");
  console.log("4. Attempt purchase with testing account");
  console.log("5. Verify purchase completes and entitlement activates\n");

  console.log("Code Test:");
  console.log("Run: npm run verify-revenuecat");
  console.log("This will check if offerings can be retrieved.\n");
}

function generateConfigFiles() {
  printSection("Step 6: Generate Configuration Files");

  const setupDir = path.join(process.cwd(), "setup");

  const productionSetup = {
    updated: new Date().toISOString(),
    config: CONFIG,
    instructions: {
      ios_products: CONFIG.products.map((p) => p.storeProductId.ios),
      android_products: CONFIG.products.map((p) => p.storeProductId.android),
      entitlement: CONFIG.entitlement,
      offering: CONFIG.offering,
    },
    apiKeyFormat: {
      ios: "appl_XXXXXXXXXXXXX",
      android: "goog_XXXXXXXXXXXXX",
    },
  };

  const outputPath = path.join(setupDir, "revenuecat-production-config.json");

  try {
    fs.writeFileSync(outputPath, JSON.stringify(productionSetup, null, 2));
    printSuccess(`Configuration saved to: ${outputPath}`);
  } catch (error) {
    printError(`Failed to save configuration: ${error}`);
  }
}

function generateChecklist() {
  printSection("Production Checklist");

  const checklist = [
    { task: "RevenueCat project created", done: false },
    { task: "iOS app added to RevenueCat", done: false },
    { task: "Android app added to RevenueCat", done: false },
    { task: "Platform-specific API keys obtained", done: false },
    { task: "API keys added to .env file", done: false },
    { task: "iOS subscriptions created in App Store Connect", done: false },
    { task: "Android subscriptions created in Play Console", done: false },
    { task: "Products imported to RevenueCat", done: false },
    { task: "Entitlement created and linked", done: false },
    { task: "Offering created and set as current", done: false },
    { task: "iOS sandbox testing completed", done: false },
    { task: "Android testing completed", done: false },
    { task: "Production purchase tested", done: false },
  ];

  console.log("\n📋 Complete these steps:\n");
  checklist.forEach((item, index) => {
    const checkbox = item.done ? "☑" : "☐";
    console.log(`${checkbox} ${index + 1}. ${item.task}`);
  });
  console.log("");
}

function printSummary() {
  printSection("Summary");

  console.log("\n📦 Product Configuration:");
  CONFIG.products.forEach((product) => {
    console.log(`\n${product.name}:`);
    console.log(`  - iOS Product ID: ${product.storeProductId.ios}`);
    console.log(`  - Android Product ID: ${product.storeProductId.android}`);
    console.log(`  - Price: $${product.price.toFixed(2)} USD`);
    console.log(`  - RevenueCat Package: $rc_${product.identifier}`);
  });

  console.log(`\n🎯 Entitlement: ${CONFIG.entitlement}`);
  console.log(`📦 Offering: ${CONFIG.offering}`);

  console.log("\n🔗 Useful Links:");
  console.log("  - RevenueCat Dashboard: https://app.revenuecat.com");
  console.log("  - App Store Connect: https://appstoreconnect.apple.com");
  console.log("  - Play Console: https://play.google.com/console");
  console.log("  - RevenueCat Docs: https://docs.revenuecat.com");
  console.log("");
}

async function main() {
  printHeader("RevenueCat Production Setup - Toxic Confessions");

  console.log("This script will guide you through setting up RevenueCat for production.\n");
  console.log("You will need access to:");
  console.log("  • RevenueCat Dashboard (app.revenuecat.com)");
  console.log("  • App Store Connect (appstoreconnect.apple.com)");
  console.log("  • Google Play Console (play.google.com/console)\n");

  const apiKeys = checkEnvironmentVariables();
  generateAppStoreConnectInstructions();
  generatePlayConsoleInstructions();
  generateRevenueCatInstructions(apiKeys);
  generateTestingInstructions();
  generateConfigFiles();
  generateChecklist();
  printSummary();

  printHeader("Next Steps");
  console.log("1. Follow the instructions above in order");
  console.log("2. Update your .env file with platform-specific API keys");
  console.log("3. Create products in App Store Connect and Play Console");
  console.log("4. Configure RevenueCat dashboard");
  console.log("5. Run: npm run verify-revenuecat");
  console.log("6. Test purchases in sandbox/testing environments");
  console.log("7. Deploy to production!\n");

  printInfo("Save this output for reference during setup.");
  console.log("");
}

main().catch((error) => {
  printError(`Script failed: ${error.message}`);
  process.exit(1);
});
