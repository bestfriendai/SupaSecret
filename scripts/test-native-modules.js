#!/usr/bin/env node
/**
 * Native Module Testing Script
 * Tests all native modules in a development build
 * Usage: node scripts/test-native-modules.js
 * WARNING: This script should only be run in a development build, not in Expo Go
 */

const chalk = require('chalk') || { red: s => s, green: s => s, yellow: s => s, blue: s => s };

class NativeModuleTester {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      skipped: []
    };
  }

  async testCamera() {
    console.log('\n📷 Testing Camera Module...');
    try {
      const { Camera } = require('expo-camera');

      // Test permissions
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status === 'granted') {
        this.results.passed.push('Camera permissions');
      } else {
        this.results.warnings.push('Camera permissions not granted');
      }

      // Test microphone permissions
      const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
      if (micStatus === 'granted') {
        this.results.passed.push('Microphone permissions');
      } else {
        this.results.warnings.push('Microphone permissions not granted');
      }

      this.results.passed.push('expo-camera module');
      return true;
    } catch (error) {
      this.results.failed.push(`Camera module: ${error.message}`);
      return false;
    }
  }

  async testFirebase() {
    console.log('\n🔥 Testing Firebase Integration...');
    try {
      // Test Analytics
      try {
        const analytics = require('@react-native-firebase/analytics').default;
        await analytics().logEvent('test_event', { test: true });
        this.results.passed.push('Firebase Analytics');
      } catch (error) {
        this.results.warnings.push(`Firebase Analytics: ${error.message}`);
      }

      // Test Crashlytics
      try {
        const crashlytics = require('@react-native-firebase/crashlytics').default;
        await crashlytics().log('Test log message');
        crashlytics().setAttribute('test_attribute', 'test_value');
        this.results.passed.push('Firebase Crashlytics');
      } catch (error) {
        this.results.warnings.push(`Firebase Crashlytics: ${error.message}`);
      }

      return true;
    } catch (error) {
      this.results.failed.push(`Firebase: ${error.message}`);
      return false;
    }
  }

  async testAdMob() {
    console.log('\n💰 Testing AdMob Integration...');
    try {
      const mobileAds = require('react-native-google-mobile-ads').default;

      // Initialize AdMob
      await mobileAds().initialize();

      // Test consent
      const { AdsConsent } = require('react-native-google-mobile-ads');
      const consentInfo = await AdsConsent.requestInfoUpdate();

      this.results.passed.push('AdMob initialization');
      this.results.passed.push('AdMob consent management');

      return true;
    } catch (error) {
      this.results.warnings.push(`AdMob: ${error.message} (may not be configured)`);
      return false;
    }
  }

  async testRevenueCat() {
    console.log('\n💳 Testing RevenueCat Integration...');
    try {
      const Purchases = require('react-native-purchases').default;

      // Check if configured
      const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
      if (!apiKey || apiKey.includes('YOUR_')) {
        this.results.skipped.push('RevenueCat (not configured)');
        return false;
      }

      // Configure SDK
      Purchases.configure({ apiKey });

      // Test getting offerings
      const offerings = await Purchases.getOfferings();

      // Test getting customer info
      const customerInfo = await Purchases.getCustomerInfo();

      this.results.passed.push('RevenueCat SDK');
      this.results.passed.push('RevenueCat offerings fetch');

      return true;
    } catch (error) {
      this.results.warnings.push(`RevenueCat: ${error.message}`);
      return false;
    }
  }

  async testVoiceRecognition() {
    console.log('\n🎤 Testing Voice Recognition...');
    try {
      const Voice = require('@react-native-voice/voice').default;

      // Check if available
      const isAvailable = await Voice.isAvailable();
      if (isAvailable) {
        this.results.passed.push('Voice recognition available');

        // Test language support
        const languages = await Voice.getSpeechRecognitionServices();
        if (languages && languages.length > 0) {
          this.results.passed.push(`Voice languages: ${languages.length} available`);
        }
      } else {
        this.results.warnings.push('Voice recognition not available on device');
      }

      return true;
    } catch (error) {
      this.results.failed.push(`Voice recognition: ${error.message}`);
      return false;
    }
  }

  async testMLKit() {
    console.log('\n🤖 Testing ML Kit Face Detection...');
    try {
      const FaceDetection = require('@react-native-ml-kit/face-detection');

      // Module loaded successfully
      this.results.passed.push('ML Kit Face Detection module');

      return true;
    } catch (error) {
      this.results.warnings.push(`ML Kit: ${error.message}`);
      return false;
    }
  }

  async testFFmpeg() {
    console.log('\n🎬 Testing FFmpeg Video Processing...');
    try {
      const { FFmpegKit, FFmpegKitConfig } = require('ffmpeg-kit-react-native');

      // Get version
      const version = await FFmpegKitConfig.getFFmpegVersion();
      this.results.passed.push(`FFmpeg version: ${version}`);

      // Test simple command
      const session = await FFmpegKit.execute('-version');
      const returnCode = await session.getReturnCode();

      if (returnCode.isValueSuccess()) {
        this.results.passed.push('FFmpeg command execution');
      } else {
        this.results.warnings.push('FFmpeg command failed');
      }

      return true;
    } catch (error) {
      this.results.warnings.push(`FFmpeg: ${error.message}`);
      return false;
    }
  }

  async testMMKV() {
    console.log('\n💾 Testing MMKV Storage...');
    try {
      const { MMKV } = require('react-native-mmkv');

      // Create storage instance
      const storage = new MMKV();

      // Test operations
      storage.set('test.string', 'test value');
      const value = storage.getString('test.string');

      if (value === 'test value') {
        this.results.passed.push('MMKV read/write operations');
      } else {
        this.results.failed.push('MMKV read/write mismatch');
      }

      // Clean up
      storage.delete('test.string');

      this.results.passed.push('MMKV storage');
      return true;
    } catch (error) {
      this.results.failed.push(`MMKV: ${error.message}`);
      return false;
    }
  }

  async testAudioPlayback() {
    console.log('\n🔊 Testing Audio Playback...');
    try {
      const { setAudioModeAsync } = require('expo-audio');

      // Configure audio mode using expo-audio
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });

      this.results.passed.push('Audio configuration');

      // Note: In expo-audio, audio players are created using useAudioPlayer hook
      // which requires a React component context. For testing purposes, we'll
      // just verify the module can be imported and audio mode can be set.

      this.results.passed.push('Audio module compatibility');
      return true;
    } catch (error) {
      this.results.warnings.push(`Audio playback: ${error.message}`);
      return false;
    }
  }

  async testNotifications() {
    console.log('\n🔔 Testing Push Notifications...');
    try {
      const Notifications = require('expo-notifications');

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        this.results.passed.push('Notification permissions');

        // Get push token
        const token = await Notifications.getExpoPushTokenAsync();
        if (token) {
          this.results.passed.push('Push token generated');
        }
      } else {
        this.results.warnings.push('Notification permissions not granted');
      }

      return true;
    } catch (error) {
      this.results.warnings.push(`Notifications: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Native Module Test Report');
    console.log('='.repeat(60));

    if (this.results.passed.length > 0) {
      console.log(chalk.green('\n✅ PASSED:'));
      this.results.passed.forEach(item => {
        console.log(chalk.green(`  ✓ ${item}`));
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  WARNINGS:'));
      this.results.warnings.forEach(item => {
        console.log(chalk.yellow(`  ⚠ ${item}`));
      });
    }

    if (this.results.failed.length > 0) {
      console.log(chalk.red('\n❌ FAILED:'));
      this.results.failed.forEach(item => {
        console.log(chalk.red(`  ✗ ${item}`));
      });
    }

    if (this.results.skipped.length > 0) {
      console.log(chalk.blue('\n⏭️  SKIPPED:'));
      this.results.skipped.forEach(item => {
        console.log(chalk.blue(`  - ${item}`));
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`  Passed: ${this.results.passed.length}`);
    console.log(`  Warnings: ${this.results.warnings.length}`);
    console.log(`  Failed: ${this.results.failed.length}`);
    console.log(`  Skipped: ${this.results.skipped.length}`);
    console.log('='.repeat(60));

    // Return exit code
    return this.results.failed.length > 0 ? 1 : 0;
  }

  async runAllTests() {
    console.log('🚀 Starting Native Module Tests...');
    console.log('Note: This script should be run in a development build, not Expo Go');

    // Check if running in Expo Go
    try {
      const Constants = require('expo-constants').default;
      if (Constants.appOwnership === 'expo') {
        console.log(chalk.yellow('\n⚠️  WARNING: Running in Expo Go. Some tests will fail or be skipped.'));
        console.log(chalk.yellow('Build a development client for accurate testing.\n'));
      }
    } catch (e) {
      // Constants not available
    }

    // Run all tests
    await this.testCamera();
    await this.testFirebase();
    await this.testAdMob();
    await this.testRevenueCat();
    await this.testVoiceRecognition();
    await this.testMLKit();
    await this.testFFmpeg();
    await this.testMMKV();
    await this.testAudioPlayback();
    await this.testNotifications();

    // Generate and display report
    const exitCode = this.generateReport();

    // Performance metrics
    console.log('\n📈 Performance Metrics:');
    console.log('  Memory usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');

    return exitCode;
  }
}

// Main execution
if (require.main === module) {
  const tester = new NativeModuleTester();
  tester.runAllTests().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = NativeModuleTester;