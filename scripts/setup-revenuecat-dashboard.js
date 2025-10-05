#!/usr/bin/env node

/**
 * RevenueCat Dashboard Setup Script
 * Generates configuration data and instructions for setting up RevenueCat dashboard
 */

const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Configuration data
const REVENUECAT_CONFIG = {
  app: {
    name: "Toxic Confessions",
    bundleId: "com.toxic.confessions",
    packageName: "com.toxic.confessions",
  },
  entitlements: [
    {
      identifier: "supasecret_plus",
      name: "Premium Access",
      description: "Full access to all premium features",
    },
  ],
  products: [
    {
      identifier: "supasecret_plus_monthly",
      name: "ToxicConfessions Plus Monthly",
      type: "subscription",
      duration: "monthly",
      price: 4.99,
      currency: "USD",
      entitlements: ["supasecret_plus"],
      features: [
        "Ad-free experience",
        "Unlimited video recordings (up to 5 minutes)",
        "Higher quality video (4K)",
        "Unlimited saves",
        "Advanced filters",
        "Priority processing",
        "Custom themes",
        "Early access to new features",
      ],
    },
    {
      identifier: "supasecret_plus_annual",
      name: "ToxicConfessions Plus Annual",
      type: "subscription",
      duration: "annual",
      price: 29.99,
      currency: "USD",
      entitlements: ["supasecret_plus"],
      features: [
        "Ad-free experience",
        "Unlimited video recordings (up to 5 minutes)",
        "Higher quality video (4K)",
        "Unlimited saves",
        "Advanced filters",
        "Priority processing",
        "Custom themes",
        "Early access to new features",
        "Save 50% compared to monthly",
      ],
      popular: true,
    },
  ],
  offerings: [
    {
      identifier: "default",
      name: "ToxicConfessions Plus",
      description: "Premium subscription for ToxicConfessions",
      packages: [
        {
          identifier: "monthly",
          productIdentifier: "supasecret_plus_monthly",
        },
        {
          identifier: "annual",
          productIdentifier: "supasecret_plus_annual",
          recommended: true,
        },
      ],
    },
  ],
};

function generateDashboardInstructions() {
  log(`${colors.bold}${colors.cyan}🚀 RevenueCat Dashboard Setup Instructions${colors.reset}\n`);

  // App Setup
  log(`${colors.bold}${colors.blue}1. Create App${colors.reset}`);
  log(`   • Go to: https://app.revenuecat.com`);
  log(`   • Click "Create new app"`);
  log(`   • App Name: ${colors.green}${REVENUECAT_CONFIG.app.name}${colors.reset}`);
  log(`   • iOS Bundle ID: ${colors.green}${REVENUECAT_CONFIG.app.bundleId}${colors.reset}`);
  log(`   • Android Package: ${colors.green}${REVENUECAT_CONFIG.app.packageName}${colors.reset}`);
  log(`   • Select both iOS and Android platforms\n`);

  // Entitlements
  log(`${colors.bold}${colors.blue}2. Create Entitlements${colors.reset}`);
  REVENUECAT_CONFIG.entitlements.forEach((entitlement, index) => {
    log(`   ${colors.yellow}Entitlement ${index + 1}:${colors.reset}`);
    log(`   • ID: ${colors.green}${entitlement.identifier}${colors.reset}`);
    log(`   • Name: ${colors.green}${entitlement.name}${colors.reset}`);
    log(`   • Description: ${colors.green}${entitlement.description}${colors.reset}`);
  });
  log("");

  // Products
  log(`${colors.bold}${colors.blue}3. Create Products${colors.reset}`);
  REVENUECAT_CONFIG.products.forEach((product, index) => {
    log(`   ${colors.yellow}Product ${index + 1}:${colors.reset}`);
    log(`   • ID: ${colors.green}${product.identifier}${colors.reset}`);
    log(`   • Name: ${colors.green}${product.name}${colors.reset}`);
    log(`   • Type: ${colors.green}${product.type}${colors.reset}`);
    log(`   • Price: ${colors.green}$${product.price} ${product.currency}${colors.reset}`);
    log(`   • Duration: ${colors.green}${product.duration}${colors.reset}`);
    log(`   • Entitlements: ${colors.green}${product.entitlements.join(", ")}${colors.reset}`);
    if (product.popular) {
      log(`   • ${colors.magenta}⭐ Mark as Popular${colors.reset}`);
    }
    log("");
  });

  // Offerings
  log(`${colors.bold}${colors.blue}4. Create Offerings${colors.reset}`);
  REVENUECAT_CONFIG.offerings.forEach((offering, index) => {
    log(`   ${colors.yellow}Offering ${index + 1}:${colors.reset}`);
    log(`   • ID: ${colors.green}${offering.identifier}${colors.reset}`);
    log(`   • Name: ${colors.green}${offering.name}${colors.reset}`);
    log(`   • Description: ${colors.green}${offering.description}${colors.reset}`);
    log(`   • Packages:`);
    offering.packages.forEach((pkg) => {
      log(
        `     - ${colors.green}${pkg.identifier}${colors.reset} → ${colors.green}${pkg.productIdentifier}${colors.reset}${pkg.recommended ? ` ${colors.magenta}(Recommended)${colors.reset}` : ""}`,
      );
    });
  });
  log("");

  // Store Setup
  log(`${colors.bold}${colors.blue}5. Store Configuration${colors.reset}`);
  log(`   ${colors.yellow}App Store Connect (iOS):${colors.reset}`);
  log(`   • Connect your App Store Connect account`);
  log(`   • Create subscription group: ${colors.green}supasecret_plus_group${colors.reset}`);
  REVENUECAT_CONFIG.products.forEach((product) => {
    log(`   • Create subscription: ${colors.green}${product.identifier}${colors.reset} ($${product.price})`);
  });
  log("");

  log(`   ${colors.yellow}Google Play Console (Android):${colors.reset}`);
  log(`   • Connect your Google Play Console account`);
  log(`   • Create subscription group: ${colors.green}supasecret_plus_group${colors.reset}`);
  REVENUECAT_CONFIG.products.forEach((product) => {
    log(`   • Create subscription: ${colors.green}${product.identifier}${colors.reset} ($${product.price})`);
  });
  log("");

  // API Keys
  log(`${colors.bold}${colors.blue}6. API Keys${colors.reset}`);
  log(`   Your API keys are already configured in .env:`);
  log(`   • iOS: ${colors.green}appl_DOIFtYSbtSxeplMuPlcSNIEapYvOz${colors.reset}`);
  log(`   • Android: ${colors.green}goog_DOIFtYSbtSxeplMuPlcSNIEapYvOz${colors.reset}`);
  log("");

  // Testing
  log(`${colors.bold}${colors.blue}7. Testing${colors.reset}`);
  log(`   • Enable Sandbox mode in RevenueCat dashboard`);
  log(`   • Create test accounts in App Store Connect and Google Play Console`);
  log(`   • Run: ${colors.green}npm run verify-revenuecat${colors.reset}`);
  log(`   • Test purchase flow in your app`);
  log("");

  // Final Steps
  log(`${colors.bold}${colors.green}✅ Final Checklist${colors.reset}`);
  log(`   □ App created in RevenueCat dashboard`);
  log(`   □ Entitlements configured`);
  log(`   □ Products created and linked to entitlements`);
  log(`   □ Offerings created with packages`);
  log(`   □ App Store Connect integrated`);
  log(`   □ Google Play Console integrated`);
  log(`   □ In-app purchases created in both stores`);
  log(`   □ Sandbox testing completed`);
  log(`   □ Production testing completed`);
  log("");

  log(`${colors.bold}${colors.cyan}🎉 Your RevenueCat setup is ready!${colors.reset}`);
  log(`${colors.yellow}Next: Test your integration with sandbox accounts${colors.reset}`);
}

function generateConfigurationFiles() {
  // Update dashboard config
  const configPath = path.join(process.cwd(), "setup/revenuecat-dashboard-config.json");
  fs.writeFileSync(configPath, JSON.stringify(REVENUECAT_CONFIG, null, 2));
  log(`${colors.green}✅ Updated: ${configPath}${colors.reset}`);

  // Generate store configuration
  const storeConfig = {
    ios: {
      bundleId: REVENUECAT_CONFIG.app.bundleId,
      subscriptions: REVENUECAT_CONFIG.products.map((product) => ({
        productId: product.identifier,
        name: product.name,
        price: `$${product.price}`,
        duration: product.duration,
        subscriptionGroup: "supasecret_plus_group",
      })),
    },
    android: {
      packageName: REVENUECAT_CONFIG.app.packageName,
      subscriptions: REVENUECAT_CONFIG.products.map((product) => ({
        productId: product.identifier,
        name: product.name,
        price: `$${product.price}`,
        duration: product.duration,
        subscriptionGroup: "supasecret_plus_group",
      })),
    },
  };

  const storeConfigPath = path.join(process.cwd(), "setup/store-configuration.json");
  fs.writeFileSync(storeConfigPath, JSON.stringify(storeConfig, null, 2));
  log(`${colors.green}✅ Generated: ${storeConfigPath}${colors.reset}`);
}

// Main execution
if (require.main === module) {
  log(`${colors.bold}${colors.cyan}RevenueCat Dashboard Setup${colors.reset}\n`);

  generateDashboardInstructions();

  log(`\n${colors.bold}Generating configuration files...${colors.reset}`);
  generateConfigurationFiles();

  log(`\n${colors.bold}${colors.green}Setup complete! 🎉${colors.reset}`);
  log(`Run ${colors.cyan}npm run verify-revenuecat${colors.reset} to verify your configuration.`);
}

module.exports = { REVENUECAT_CONFIG, generateDashboardInstructions, generateConfigurationFiles };
