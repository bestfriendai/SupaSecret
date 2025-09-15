#!/usr/bin/env node
/**
 * Automated Production Build Script
 * Creates production builds for iOS and Android
 * Usage: node scripts/create-production-build.js [--platform=ios|android|both]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chalk = require('chalk') || { red: s => s, green: s => s, yellow: s => s, blue: s => s };

// Parse command line arguments
const args = process.argv.slice(2);
const platform = args.find(arg => arg.startsWith('--platform='))?.split('=')[1] || 'both';

class ProductionBuilder {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.buildResults = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}]`;

    switch(type) {
      case 'error':
        console.error(chalk.red(`${prefix} ❌ ${message}`));
        break;
      case 'warning':
        console.warn(chalk.yellow(`${prefix} ⚠️  ${message}`));
        break;
      case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
      default:
        console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
    }
  }

  exec(command, options = {}) {
    try {
      this.log(`Executing: ${command}`);
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
      return result;
    } catch (error) {
      this.errors.push(`Command failed: ${command}`);
      throw error;
    }
  }

  async validateConfiguration() {
    this.log('Validating production configuration...');

    try {
      // Run configuration validator
      this.exec('node scripts/validate-production-config.js', { silent: true });
      this.log('Configuration validation passed', 'success');
      return true;
    } catch (error) {
      this.log('Configuration validation failed', 'error');
      this.log('Please fix configuration issues before building', 'error');
      return false;
    }
  }

  async checkDependencies() {
    this.log('Checking dependencies...');

    // Check for EAS CLI
    try {
      const easVersion = this.exec('eas --version', { silent: true }).trim();
      this.log(`EAS CLI version: ${easVersion}`, 'success');
    } catch {
      this.log('EAS CLI not found. Installing...', 'warning');
      this.exec('npm install -g eas-cli');
    }

    // Check for Expo CLI
    try {
      const expoVersion = this.exec('expo --version', { silent: true }).trim();
      this.log(`Expo CLI version: ${expoVersion}`, 'success');
    } catch {
      this.log('Expo CLI not found. Installing...', 'warning');
      this.exec('npm install -g expo-cli');
    }

    // Check authentication
    try {
      this.exec('eas whoami', { silent: true });
      this.log('EAS authentication verified', 'success');
    } catch {
      this.log('Not authenticated with EAS. Please run: eas login', 'error');
      return false;
    }

    return true;
  }

  async runTypeCheck() {
    this.log('Running TypeScript type check...');

    try {
      this.exec('npm run typecheck', { silent: true });
      this.log('TypeScript check passed', 'success');
      return true;
    } catch (error) {
      this.log('TypeScript errors found', 'error');
      this.warnings.push('Build proceeding with TypeScript errors');
      return false;
    }
  }

  async runSecurityAudit() {
    this.log('Running security audit...');

    try {
      const auditResult = this.exec('npm audit --json', { silent: true });
      const audit = JSON.parse(auditResult);

      if (audit.metadata.vulnerabilities.critical > 0) {
        this.log(`Found ${audit.metadata.vulnerabilities.critical} critical vulnerabilities`, 'error');
        this.warnings.push('Building with critical security vulnerabilities');
      } else if (audit.metadata.vulnerabilities.high > 0) {
        this.log(`Found ${audit.metadata.vulnerabilities.high} high vulnerabilities`, 'warning');
      } else {
        this.log('No critical vulnerabilities found', 'success');
      }

      return audit.metadata.vulnerabilities.critical === 0;
    } catch (error) {
      this.log('Security audit failed', 'warning');
      return false;
    }
  }

  async cleanPreviousBuilds() {
    this.log('Cleaning previous builds...');

    try {
      // Clean Expo prebuild
      if (fs.existsSync('ios') || fs.existsSync('android')) {
        this.exec('expo prebuild --clean');
        this.log('Cleaned previous prebuild files', 'success');
      }

      // Clear Metro cache
      this.exec('npx expo start --clear', { silent: true });
      this.log('Cleared Metro cache', 'success');

      return true;
    } catch (error) {
      this.log('Clean failed', 'warning');
      return false;
    }
  }

  async buildIOS() {
    this.log('Starting iOS production build...');

    try {
      // Start build
      const buildCommand = 'eas build --platform ios --profile production --non-interactive';
      const result = this.exec(buildCommand);

      // Extract build ID from output
      const buildIdMatch = result.match(/Build ID: ([\w-]+)/);
      if (buildIdMatch) {
        this.buildResults.ios = {
          buildId: buildIdMatch[1],
          status: 'success',
          timestamp: new Date().toISOString()
        };

        this.log(`iOS build started successfully. Build ID: ${buildIdMatch[1]}`, 'success');
        this.log('You can monitor the build at: https://expo.dev/accounts/[your-account]/builds', 'info');
      }

      return true;
    } catch (error) {
      this.log('iOS build failed', 'error');
      this.buildResults.ios = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async buildAndroid() {
    this.log('Starting Android production build...');

    try {
      // Start build
      const buildCommand = 'eas build --platform android --profile production --non-interactive';
      const result = this.exec(buildCommand);

      // Extract build ID from output
      const buildIdMatch = result.match(/Build ID: ([\w-]+)/);
      if (buildIdMatch) {
        this.buildResults.android = {
          buildId: buildIdMatch[1],
          status: 'success',
          timestamp: new Date().toISOString()
        };

        this.log(`Android build started successfully. Build ID: ${buildIdMatch[1]}`, 'success');
        this.log('You can monitor the build at: https://expo.dev/accounts/[your-account]/builds', 'info');
      }

      return true;
    } catch (error) {
      this.log('Android build failed', 'error');
      this.buildResults.android = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      return false;
    }
  }

  async waitForBuilds() {
    this.log('Waiting for builds to complete...');
    this.log('This may take 20-40 minutes. You can close this script and check status later.', 'info');

    // In a real implementation, you would poll EAS API for build status
    // For now, we'll just provide instructions

    if (this.buildResults.ios?.buildId) {
      this.log(`iOS Build: eas build:view ${this.buildResults.ios.buildId}`, 'info');
    }

    if (this.buildResults.android?.buildId) {
      this.log(`Android Build: eas build:view ${this.buildResults.android.buildId}`, 'info');
    }

    this.log('To download completed builds: eas build:download --platform=[ios|android]', 'info');
  }

  generateReport() {
    this.log('\n' + '='.repeat(60));
    this.log('📊 Production Build Report');
    this.log('='.repeat(60));

    // Build results
    if (this.buildResults.ios) {
      this.log('\niOS Build:');
      this.log(`  Status: ${this.buildResults.ios.status}`);
      if (this.buildResults.ios.buildId) {
        this.log(`  Build ID: ${this.buildResults.ios.buildId}`);
      }
      if (this.buildResults.ios.error) {
        this.log(`  Error: ${this.buildResults.ios.error}`);
      }
    }

    if (this.buildResults.android) {
      this.log('\nAndroid Build:');
      this.log(`  Status: ${this.buildResults.android.status}`);
      if (this.buildResults.android.buildId) {
        this.log(`  Build ID: ${this.buildResults.android.buildId}`);
      }
      if (this.buildResults.android.error) {
        this.log(`  Error: ${this.buildResults.android.error}`);
      }
    }

    // Warnings and errors
    if (this.warnings.length > 0) {
      this.log('\nWarnings:', 'warning');
      this.warnings.forEach(warning => {
        this.log(`  - ${warning}`, 'warning');
      });
    }

    if (this.errors.length > 0) {
      this.log('\nErrors:', 'error');
      this.errors.forEach(error => {
        this.log(`  - ${error}`, 'error');
      });
    }

    // Next steps
    this.log('\n📋 Next Steps:');
    this.log('1. Monitor build progress at https://expo.dev');
    this.log('2. Download completed builds: eas build:download');
    this.log('3. Test builds on physical devices');
    this.log('4. Submit to app stores: eas submit');

    // Save report to file
    const reportPath = path.join(process.cwd(), 'build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      platform,
      results: this.buildResults,
      warnings: this.warnings,
      errors: this.errors
    }, null, 2));

    this.log(`\nBuild report saved to: ${reportPath}`, 'success');

    this.log('='.repeat(60));
  }

  async run() {
    this.log('🚀 Starting Production Build Process');
    this.log(`Platform: ${platform}`);
    this.log('='.repeat(60));

    // Pre-build validation
    if (!await this.checkDependencies()) {
      this.log('Dependency check failed', 'error');
      return 1;
    }

    if (!await this.validateConfiguration()) {
      this.log('Configuration validation failed', 'error');
      return 1;
    }

    // Pre-build checks
    await this.runTypeCheck();
    await this.runSecurityAudit();

    // Clean previous builds
    await this.cleanPreviousBuilds();

    // Start builds based on platform
    if (platform === 'ios' || platform === 'both') {
      await this.buildIOS();
    }

    if (platform === 'android' || platform === 'both') {
      await this.buildAndroid();
    }

    // Wait for builds and generate report
    await this.waitForBuilds();
    this.generateReport();

    // Return exit code
    return this.errors.length > 0 ? 1 : 0;
  }
}

// Main execution
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = ProductionBuilder;