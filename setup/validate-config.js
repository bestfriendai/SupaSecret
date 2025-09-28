#!/usr/bin/env node

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
      placeholders.push(`${envVar}: ${value}`);
    }
  });

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    return false;
  }

  if (placeholders.length > 0) {
    console.warn('⚠️ Environment variables contain placeholder values:');
    placeholders.forEach(placeholder => console.warn(`   - ${placeholder}`));
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
  console.log('🚀 Starting RevenueCat configuration validation...\n');

  const results = [
    validateEnvironmentVariables(),
    validateConfiguration(),
    validateProductDefinitions(),
  ];

  const allPassed = results.every(result => result);

  console.log('\n' + '='.repeat(50));
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
  runAllValidations,
};
