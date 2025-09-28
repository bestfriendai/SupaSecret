#!/usr/bin/env node

/**
 * RevenueCat Setup Verification Script
 * Verifies that RevenueCat is properly configured and can connect to the dashboard
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkmark() {
  return `${colors.green}✅${colors.reset}`;
}

function crossmark() {
  return `${colors.red}❌${colors.reset}`;
}

function warning() {
  return `${colors.yellow}⚠️${colors.reset}`;
}

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    log(`${crossmark()} .env file not found`, colors.red);
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });

  return env;
}

// Verification checks
async function verifyRevenueCatSetup() {
  log(`${colors.bold}🚀 RevenueCat Setup Verification${colors.reset}\n`);

  const env = loadEnvFile();
  let allChecksPass = true;

  // Check 1: Environment Variables
  log(`${colors.bold}1. Environment Variables${colors.reset}`);
  
  const requiredEnvVars = [
    'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
    'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'
  ];

  requiredEnvVars.forEach(varName => {
    if (env[varName] && env[varName] !== 'your_revenuecat_key_here') {
      log(`   ${checkmark()} ${varName}: ${env[varName].substring(0, 20)}...`);
    } else {
      log(`   ${crossmark()} ${varName}: Missing or placeholder value`, colors.red);
      allChecksPass = false;
    }
  });

  // Check 2: API Key Format
  log(`\n${colors.bold}2. API Key Format Validation${colors.reset}`);
  
  const iosKey = env['EXPO_PUBLIC_REVENUECAT_IOS_KEY'];
  const androidKey = env['EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'];

  if (iosKey && iosKey.startsWith('appl_')) {
    log(`   ${checkmark()} iOS API key has correct format (appl_)`);
  } else {
    log(`   ${crossmark()} iOS API key should start with 'appl_'`, colors.red);
    allChecksPass = false;
  }

  if (androidKey && androidKey.startsWith('goog_')) {
    log(`   ${checkmark()} Android API key has correct format (goog_)`);
  } else {
    log(`   ${crossmark()} Android API key should start with 'goog_'`, colors.red);
    allChecksPass = false;
  }

  // Check 3: Configuration Files
  log(`\n${colors.bold}3. Configuration Files${colors.reset}`);
  
  const configFiles = [
    'src/config/production.ts',
    'src/services/RevenueCatService.ts',
    'setup/revenuecat-dashboard-config.json'
  ];

  configFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      log(`   ${checkmark()} ${filePath} exists`);
    } else {
      log(`   ${crossmark()} ${filePath} missing`, colors.red);
      allChecksPass = false;
    }
  });

  // Check 4: Package Dependencies
  log(`\n${colors.bold}4. Package Dependencies${colors.reset}`);
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (dependencies['react-native-purchases']) {
      log(`   ${checkmark()} react-native-purchases: ${dependencies['react-native-purchases']}`);
    } else {
      log(`   ${crossmark()} react-native-purchases not found in dependencies`, colors.red);
      allChecksPass = false;
    }
  }

  // Check 5: App Configuration
  log(`\n${colors.bold}5. App Configuration${colors.reset}`);
  
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  if (fs.existsSync(appConfigPath)) {
    log(`   ${checkmark()} app.config.js exists`);
    
    // Check bundle identifier
    try {
      const appConfig = require(path.resolve(appConfigPath));
      const config = typeof appConfig === 'function' ? appConfig({}) : appConfig;
      
      if (config.expo?.ios?.bundleIdentifier === 'com.toxic.confessions') {
        log(`   ${checkmark()} iOS bundle identifier: ${config.expo.ios.bundleIdentifier}`);
      } else {
        log(`   ${warning()} iOS bundle identifier may not match RevenueCat setup`);
      }

      if (config.expo?.android?.package === 'com.toxic.confessions') {
        log(`   ${checkmark()} Android package name: ${config.expo.android.package}`);
      } else {
        log(`   ${warning()} Android package name may not match RevenueCat setup`);
      }
    } catch (error) {
      log(`   ${warning()} Could not parse app.config.js: ${error.message}`);
    }
  }

  // Check 6: Dashboard Configuration
  log(`\n${colors.bold}6. Dashboard Configuration${colors.reset}`);
  
  const dashboardConfigPath = path.join(process.cwd(), 'setup/revenuecat-dashboard-config.json');
  if (fs.existsSync(dashboardConfigPath)) {
    try {
      const dashboardConfig = JSON.parse(fs.readFileSync(dashboardConfigPath, 'utf8'));
      
      log(`   ${checkmark()} Entitlements: ${dashboardConfig.entitlements?.length || 0}`);
      log(`   ${checkmark()} Products: ${dashboardConfig.products?.length || 0}`);
      log(`   ${checkmark()} Offerings: ${dashboardConfig.offerings?.length || 0}`);
      
      // Verify product IDs
      const expectedProducts = ['supasecret_plus_monthly', 'supasecret_plus_annual'];
      const configuredProducts = dashboardConfig.products?.map(p => p.identifier) || [];
      
      expectedProducts.forEach(productId => {
        if (configuredProducts.includes(productId)) {
          log(`   ${checkmark()} Product configured: ${productId}`);
        } else {
          log(`   ${crossmark()} Missing product: ${productId}`, colors.red);
          allChecksPass = false;
        }
      });
      
    } catch (error) {
      log(`   ${crossmark()} Error parsing dashboard config: ${error.message}`, colors.red);
      allChecksPass = false;
    }
  }

  // Final Result
  log(`\n${colors.bold}📊 Verification Summary${colors.reset}`);
  
  if (allChecksPass) {
    log(`${checkmark()} All checks passed! RevenueCat setup looks good.`, colors.green);
    log(`\n${colors.bold}Next Steps:${colors.reset}`);
    log(`1. Complete setup in RevenueCat dashboard using the guide`);
    log(`2. Create products in App Store Connect and Google Play Console`);
    log(`3. Test with sandbox accounts`);
    log(`4. Submit for app store review`);
  } else {
    log(`${crossmark()} Some checks failed. Please review the issues above.`, colors.red);
    log(`\n${colors.bold}Troubleshooting:${colors.reset}`);
    log(`1. Check your .env file has correct API keys`);
    log(`2. Ensure all configuration files are present`);
    log(`3. Verify bundle identifiers match RevenueCat setup`);
    log(`4. Review the setup guide: setup/revenuecat-setup-guide.md`);
  }

  return allChecksPass;
}

// Run verification
if (require.main === module) {
  verifyRevenueCatSetup()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`${crossmark()} Verification failed: ${error.message}`, colors.red);
      process.exit(1);
    });
}

module.exports = { verifyRevenueCatSetup };
