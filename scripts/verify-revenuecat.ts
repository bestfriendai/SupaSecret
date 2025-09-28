#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config();

console.log('🔍 Verifying RevenueCat Configuration...\n');

// Check environment variables
const checkEnvVars = () => {
  console.log('📋 Checking Environment Variables:');

  const requiredVars = {
    'EXPO_PUBLIC_REVENUECAT_IOS_KEY': process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY': process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  };

  let allPresent = true;
  for (const [name, value] of Object.entries(requiredVars)) {
    if (value) {
      console.log(`  ✅ ${name}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`  ❌ ${name}: Not set`);
      allPresent = false;
    }
  }

  return allPresent;
};

// Check configuration files
const checkConfigFiles = () => {
  console.log('\n📁 Checking Configuration Files:');

  const files = [
    'src/services/RevenueCatService.ts',
    'src/services/RevenueCatMCPService.ts',
    'src/config/production.ts',
    'src/state/membershipStore.ts',
  ];

  let allPresent = true;
  for (const file of files) {
    try {
      const fullPath = join(process.cwd(), file);
      readFileSync(fullPath, 'utf-8');
      console.log(`  ✅ ${file}`);
    } catch (error) {
      console.log(`  ❌ ${file} - File not found`);
      allPresent = false;
    }
  }

  return allPresent;
};

// Check product configuration
const checkProductConfig = () => {
  console.log('\n🛍️ Product Configuration:');

  const products = [
    { id: 'toxicconfessions_plus_monthly', name: 'Monthly Subscription', price: '$4.99' },
    { id: 'toxicconfessions_plus_annual', name: 'Annual Subscription', price: '$29.99' },
  ];

  console.log('  Products to be created in stores:');
  products.forEach(product => {
    console.log(`    • ${product.id} - ${product.name} (${product.price})`);
  });

  console.log('\n  Entitlement:');
  console.log('    • toxicconfessions_plus - Premium Access');

  console.log('\n  Offering:');
  console.log('    • default - Contains monthly and annual packages');

  return true;
};

// Check app configuration
const checkAppConfig = () => {
  console.log('\n📱 App Configuration:');

  try {
    const configPath = join(process.cwd(), 'app.config.js');
    const config = require(configPath);

    console.log(`  ✅ App Name: ${config.expo.name}`);
    console.log(`  ✅ iOS Bundle ID: ${config.expo.ios.bundleIdentifier}`);
    console.log(`  ✅ Android Package: ${config.expo.android.package}`);

    return true;
  } catch (error) {
    console.log('  ❌ Could not load app.config.js');
    return false;
  }
};

// Main verification
const main = () => {
  console.log('==========================================');
  console.log('   RevenueCat Configuration Verification');
  console.log('==========================================\n');

  const checks = [
    checkEnvVars(),
    checkConfigFiles(),
    checkProductConfig(),
    checkAppConfig(),
  ];

  const allPassed = checks.every(check => check);

  console.log('\n==========================================');
  if (allPassed) {
    console.log('✅ ✅ ✅ All checks passed! ✅ ✅ ✅');
    console.log('\nNext Steps:');
    console.log('1. Follow setup/REVENUECAT_COMPLETE_SETUP.md');
    console.log('2. Create products in App Store Connect');
    console.log('3. Create products in Google Play Console');
    console.log('4. Configure in RevenueCat Dashboard');
    console.log('5. Test with sandbox/test accounts');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
  }
  console.log('==========================================\n');

  // Display quick summary
  console.log('📊 Configuration Summary:');
  console.log('------------------------');
  console.log('iOS API Key:', process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ? '✅ Set' : '❌ Missing');
  console.log('Android API Key:', process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ? '✅ Set' : '❌ Missing');
  console.log('Products: 2 (Monthly, Annual)');
  console.log('Entitlements: 1 (toxicconfessions_plus)');
  console.log('Offerings: 1 (default)');
  console.log('');
  console.log('Premium Features Unlocked:');
  console.log('• Ad-free experience');
  console.log('• Unlimited video recordings (5 min)');
  console.log('• 4K video quality');
  console.log('• Unlimited saves');
  console.log('• Advanced filters');
  console.log('• Priority processing');
  console.log('• Custom themes');
  console.log('• Early access to features');
};

main();