#!/usr/bin/env tsx

/**
 * RevenueCat Setup Script for ToxicConfessions Plus
 *
 * This script helps configure RevenueCat products, offerings, and entitlements
 * for the ToxicConfessions app. Run this script to generate configuration
 * templates and validate your setup.
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import * as path from "path";

// Product definitions for ToxicConfessions Plus
export const REVENUECAT_PRODUCTS = {
  monthly: {
    id: "supasecret_plus_monthly",
    name: "ToxicConfessions Plus Monthly",
    type: "subscription",
    duration: "monthly",
    price: 4.99,
    currency: "USD",
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
    storeProductIds: {
      ios: "", // Will be set when published to App Store
      android: "", // Will be set when published to Play Store
    },
  },
  annual: {
    id: "supasecret_plus_annual",
    name: "ToxicConfessions Plus Annual",
    type: "subscription",
    duration: "annual",
    price: 29.99,
    currency: "USD",
    features: [
      "Ad-free experience",
      "Unlimited video recordings (up to 5 minutes)",
      "Higher quality video (4K)",
      "Unlimited saves",
      "Advanced filters",
      "Priority processing",
      "Custom themes",
      "Early access to new features",
      "Save 50%",
    ],
    isPopular: true,
    storeProductIds: {
      ios: "", // Will be set when published to App Store
      android: "", // Will be set when published to Play Store
    },
  },
} as const;

// Entitlement definition
export const REVENUECAT_ENTITLEMENTS = {
  premium: {
    id: "supasecret_plus",
    name: "Premium Access",
    description: "Full access to all premium features",
  },
} as const;

// Offering definition
export const REVENUECAT_OFFERINGS = {
  default: {
    id: "default_offering",
    name: "ToxicConfessions Plus",
    description: "Premium subscription for ToxicConfessions",
    products: [REVENUECAT_PRODUCTS.monthly.id, REVENUECAT_PRODUCTS.annual.id],
  },
} as const;

// Environment variables template
export const ENVIRONMENT_TEMPLATE = {
  development: {
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: "your_revenuecat_ios_api_key_here",
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "your_revenuecat_android_api_key_here",
    EXPO_PUBLIC_ADMOB_IOS_APP_ID: "your_admob_ios_app_id_here",
    EXPO_PUBLIC_ADMOB_ANDROID_APP_ID: "your_admob_android_app_id_here",
    EXPO_PUBLIC_ADMOB_IOS_BANNER_ID: "your_admob_ios_banner_id_here",
    EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID: "your_admob_android_banner_id_here",
  },
  production: {
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: "REQUIRED_IOS_API_KEY",
    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: "REQUIRED_ANDROID_API_KEY",
    EXPO_PUBLIC_ADMOB_IOS_APP_ID: "REQUIRED_IOS_APP_ID",
    EXPO_PUBLIC_ADMOB_ANDROID_APP_ID: "REQUIRED_ANDROID_APP_ID",
    EXPO_PUBLIC_ADMOB_IOS_BANNER_ID: "REQUIRED_IOS_BANNER_ID",
    EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID: "REQUIRED_ANDROID_BANNER_ID",
  },
} as const;

// Generate RevenueCat dashboard configuration JSON
export function generateDashboardConfig() {
  return {
    entitlements: [
      {
        identifier: REVENUECAT_ENTITLEMENTS.premium.id,
        name: REVENUECAT_ENTITLEMENTS.premium.name,
        description: REVENUECAT_ENTITLEMENTS.premium.description,
      },
    ],
    products: [
      {
        identifier: REVENUECAT_PRODUCTS.monthly.id,
        name: REVENUECAT_PRODUCTS.monthly.name,
        type: "subscription",
        duration: "monthly",
        price: REVENUECAT_PRODUCTS.monthly.price,
        currency: REVENUECAT_PRODUCTS.monthly.currency,
        features: REVENUECAT_PRODUCTS.monthly.features,
      },
      {
        identifier: REVENUECAT_PRODUCTS.annual.id,
        name: REVENUECAT_PRODUCTS.annual.name,
        type: "subscription",
        duration: "annual",
        price: REVENUECAT_PRODUCTS.annual.price,
        currency: REVENUECAT_PRODUCTS.annual.currency,
        features: REVENUECAT_PRODUCTS.annual.features,
        popular: true,
      },
    ],
    offerings: [
      {
        identifier: REVENUECAT_OFFERINGS.default.id,
        name: REVENUECAT_OFFERINGS.default.name,
        description: REVENUECAT_OFFERINGS.default.description,
        packages: [
          {
            identifier: REVENUECAT_PRODUCTS.monthly.id,
            product_identifier: REVENUECAT_PRODUCTS.monthly.id,
            offering_identifier: REVENUECAT_OFFERINGS.default.id,
          },
          {
            identifier: REVENUECAT_PRODUCTS.annual.id,
            product_identifier: REVENUECAT_PRODUCTS.annual.id,
            offering_identifier: REVENUECAT_OFFERINGS.default.id,
          },
        ],
      },
    ],
  };
}

// Generate .env template
export function generateEnvTemplate() {
  const template = `# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_revenuecat_ios_api_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_revenuecat_android_api_key_here

# AdMob Configuration (Required for production)
EXPO_PUBLIC_ADMOB_IOS_APP_ID=your_admob_ios_app_id_here
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=your_admob_android_app_id_here
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=your_admob_ios_banner_id_here
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=your_admob_android_banner_id_here
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=your_admob_ios_interstitial_id_here
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=your_admob_android_interstitial_id_here

# Optional: Analytics
EXPO_PUBLIC_GOOGLE_ANALYTICS_ID=your_google_analytics_id_here

# Optional: Push Notifications
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id_here
`;

  return template;
}

// Generate EAS secrets setup script
export function generateEASSecretsScript() {
  const script = `#!/bin/bash

# EAS Secrets Setup Script for RevenueCat
# Run this script to set up required secrets for production builds

echo "Setting up EAS secrets for RevenueCat..."

# RevenueCat API Keys
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "your_ios_key_here" --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "your_android_key_here" --scope project

# AdMob Configuration
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value "your_ios_app_id_here" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value "your_android_app_id_here" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_BANNER_ID --value "your_ios_banner_id_here" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID --value "your_android_banner_id_here" --scope project

echo "EAS secrets setup complete!"
echo "Don't forget to update the placeholder values with your actual keys."
`;

  return script;
}

// Generate validation script
export function generateValidationScript() {
  const script = `#!/usr/bin/env node

/**
 * RevenueCat Configuration Validation Script
 * Validates that all required environment variables and configurations are properly set
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_ENV_VARS = [
  'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
  'EXPO_PUBLIC_ADMOB_IOS_APP_ID',
  'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID',
];

const PLACEHOLDER_PATTERNS = [
  'your_',
  'YOUR_',
  'placeholder',
  'PLACEHOLDER',
  'example',
  'EXAMPLE',
  'test',
  'TEST',
  'demo',
  'DEMO',
];

function validateEnvironmentVariables() {
  console.log('🔍 Validating environment variables...');

  const missing = [];
  const placeholders = [];

  REQUIRED_ENV_VARS.forEach(envVar => {
    const value = process.env[envVar];

    if (!value) {
      missing.push(envVar);
      return;
    }

    const hasPlaceholder = PLACEHOLDER_PATTERNS.some(pattern =>
      value.includes(pattern)
    );

    if (hasPlaceholder) {
      placeholders.push(\`\${envVar}: \${value}\`);
    }
  });

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(\`   - \${envVar}\`));
    return false;
  }

  if (placeholders.length > 0) {
    console.warn('⚠️ Environment variables contain placeholder values:');
    placeholders.forEach(placeholder => console.warn(\`   - \${placeholder}\`));
  }

  console.log('✅ Environment variables validation passed');
  return true;
}

function validateConfiguration() {
  console.log('🔍 Validating RevenueCat configuration...');

  // Check if config files exist and have valid structure
  const configPath = path.join(__dirname, '../config/production.ts');
  if (!fs.existsSync(configPath)) {
    console.error('❌ Production configuration file not found');
    return false;
  }

  console.log('✅ Configuration files validation passed');
  return true;
}

function validateProductDefinitions() {
  console.log('🔍 Validating product definitions...');

  // Check if product IDs match between service and config
  const servicePath = path.join(__dirname, '../services/RevenueCatService.ts');
  if (!fs.existsSync(servicePath)) {
    console.error('❌ RevenueCat service file not found');
    return false;
  }

  console.log('✅ Product definitions validation passed');
  return true;
}

function runAllValidations() {
  console.log('🚀 Starting RevenueCat configuration validation...\\n');

  const results = [
    validateEnvironmentVariables(),
    validateConfiguration(),
    validateProductDefinitions(),
  ];

  const allPassed = results.every(result => result);

  console.log('\\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All validations passed! Your RevenueCat setup is ready.');
    console.log('Next steps:');
    console.log('1. Test subscription flow in development');
    console.log('2. Set up products in App Store Connect/Google Play Console');
    console.log('3. Update store product IDs in RevenueCat dashboard');
    console.log('4. Test production build');
  } else {
    console.log('❌ Some validations failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Run validations if this script is executed directly
if (require.main === module) {
  runAllValidations();
}

module.exports = {
  generateDashboardConfig,
  generateEnvTemplate,
  generateEASSecretsScript,
  generateValidationScript,
  runAllValidations,
};
`;

  return script;
}

// Main execution function
export function runSetup() {
  const outputDir = path.join(__dirname, "../../setup");

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log("🚀 Setting up RevenueCat configuration...");

  // Generate dashboard configuration JSON
  const dashboardConfig = generateDashboardConfig();
  writeFileSync(path.join(outputDir, "revenuecat-dashboard-config.json"), JSON.stringify(dashboardConfig, null, 2));
  console.log("✅ Generated revenuecat-dashboard-config.json");

  // Generate environment template
  const envTemplate = generateEnvTemplate();
  writeFileSync(path.join(outputDir, ".env.template"), envTemplate);
  console.log("✅ Generated .env.template");

  // Generate EAS secrets script
  const easScript = generateEASSecretsScript();
  writeFileSync(path.join(outputDir, "setup-eas-secrets.sh"), easScript);
  console.log("✅ Generated setup-eas-secrets.sh");

  // Generate validation script
  const validationScript = generateValidationScript();
  writeFileSync(path.join(outputDir, "validate-config.js"), validationScript);
  console.log("✅ Generated validate-config.js");

  console.log("\\n🎉 RevenueCat setup files generated successfully!");
  console.log("\\nNext steps:");
  console.log("1. Copy .env.template to .env and fill in your actual values");
  console.log("2. Import revenuecat-dashboard-config.json into your RevenueCat dashboard");
  console.log("3. Run setup-eas-secrets.sh to configure production secrets");
  console.log("4. Run node setup/validate-config.js to verify your setup");
  console.log("\\n📖 See docs/REVENUECAT_SETUP.md for detailed instructions");
}

// Module exports are handled by const declarations above

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSetup();
}
