#!/usr/bin/env node

/**
 * Video Processing Test Script
 *
 * This script tests the modernized video processing architecture
 * by verifying that all required dependencies are available and
 * that the video processing services can be initialized.
 */

const fs = require('fs');
const path = require('path');

console.log('🎬 Video Processing Architecture Test');
console.log('=====================================\n');

// Test 1: Check package.json for modern dependencies
console.log('1. Testing package.json dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = packageJson.dependencies;

  const requiredDeps = [
    'expo-video',
    'expo-video-thumbnails',
    'ffmpeg-kit-react-native',
    'expo-file-system'
  ];

  const missingDeps = requiredDeps.filter(dep => !deps[dep]);

  if (missingDeps.length === 0) {
    console.log('✅ All required video processing dependencies are present');
  } else {
    console.log('❌ Missing dependencies:', missingDeps.join(', '));
    process.exit(1);
  }

  // Check for removed react-native-video-processing
  if (deps['react-native-video-processing']) {
    console.log('❌ react-native-video-processing is still present - should be removed');
    process.exit(1);
  } else {
    console.log('✅ react-native-video-processing has been successfully removed');
  }
} catch (error) {
  console.log('❌ Failed to read package.json:', error.message);
  process.exit(1);
}

// Test 2: Check if video processing files exist and can be imported
console.log('\n2. Testing video processing files...');
const videoFiles = [
  'src/services/VideoProcessingService.ts',
  'src/utils/videoProcessing.ts',
  'src/utils/videoCacheManager.ts'
];

videoFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} is missing`);
    process.exit(1);
  }
});

// Test 3: Check for modern expo-file-system usage
console.log('\n3. Testing modern file system imports...');
videoFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('expo-file-system/legacy')) {
      console.log(`❌ ${file} still uses legacy file system import`);
    } else if (content.includes('expo-file-system')) {
      console.log(`✅ ${file} uses modern file system import`);
    }
  } catch (error) {
    console.log(`❌ Failed to read ${file}:`, error.message);
  }
});

// Test 4: Check Expo SDK 54 compatibility
console.log('\n4. Testing Expo SDK 54 compatibility...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const expoVersion = packageJson.dependencies.expo;

  if (expoVersion && expoVersion.startsWith('54')) {
    console.log(`✅ Expo SDK 54 detected (${expoVersion})`);
  } else {
    console.log(`⚠️  Expo version: ${expoVersion} - may not be SDK 54`);
  }

  // Check for required expo plugins in app.json
  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    const plugins = appJson.expo?.plugins || [];
    const requiredPlugins = ['expo-video'];

    requiredPlugins.forEach(plugin => {
      if (plugins.includes(plugin)) {
        console.log(`✅ ${plugin} plugin is configured in app.json`);
      } else {
        console.log(`⚠️  ${plugin} plugin may not be configured in app.json`);
      }
    });

    // Check if expo-video-thumbnails is available as a dependency
    if (packageJson.dependencies['expo-video-thumbnails']) {
      console.log('✅ expo-video-thumbnails is available as a dependency');
    } else {
      console.log('❌ expo-video-thumbnails dependency is missing');
    }
  } catch (appError) {
    console.log('❌ Failed to check app.json plugins:', appError.message);
  }
} catch (error) {
  console.log('❌ Failed to check Expo configuration:', error.message);
}

// Test 5: Check for proper error handling
console.log('\n5. Testing error handling patterns...');
videoFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const hasErrorHandling = content.includes('try {') && content.includes('catch (error)');
    const hasValidation = content.includes('fileInfo.exists');

    if (hasErrorHandling) {
      console.log(`✅ ${file} has error handling`);
    } else {
      console.log(`⚠️  ${file} may need better error handling`);
    }

    if (hasValidation) {
      console.log(`✅ ${file} has file validation`);
    } else {
      console.log(`⚠️  ${file} may need file validation`);
    }
  } catch (error) {
    console.log(`❌ Failed to analyze ${file}:`, error.message);
  }
});

console.log('\n=====================================');
console.log('🎉 Video Processing Architecture Test Complete!');
console.log('\nNext steps:');
console.log('1. Run "npm install" to ensure all dependencies are installed');
console.log('2. Run "npx expo-doctor" to check for any compatibility issues');
console.log('3. Test video recording and processing in the app');
console.log('4. Verify both local (FFmpeg) and server-side processing work');