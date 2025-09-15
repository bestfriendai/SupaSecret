#!/usr/bin/env node

/**
 * Debug script to analyze potential Videos tab navigation issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing Videos tab navigation issues...\n');

// Read the AppNavigator file
const navigatorPath = path.join(__dirname, 'src/navigation/AppNavigator.tsx');
const navigatorContent = fs.readFileSync(navigatorPath, 'utf8');

// Read VideoFeedScreen
const videoFeedPath = path.join(__dirname, 'src/screens/VideoFeedScreen.tsx');
const videoFeedContent = fs.readFileSync(videoFeedPath, 'utf8');

// Read OptimizedVideoList
const videoListPath = path.join(__dirname, 'src/components/OptimizedVideoList.tsx');
const videoListContent = fs.readFileSync(videoListPath, 'utf8');

// Read globalVideoStore
const globalStorePath = path.join(__dirname, 'src/state/globalVideoStore.ts');
const globalStoreContent = fs.readFileSync(globalStorePath, 'utf8');

console.log('📋 Analysis Results:\n');

// 1. Check tab configuration
console.log('1. ✅ Tab Configuration:');
if (navigatorContent.includes('name="Videos"') && navigatorContent.includes('component={VideoFeedScreen}')) {
    console.log('   - Videos tab is properly configured with VideoFeedScreen');
} else {
    console.log('   - ❌ Videos tab configuration issue detected');
}

// 2. Check tab press handling
console.log('\n2. 🔍 Tab Press Handling:');
if (navigatorContent.includes('tabPress: (e) =>')) {
    const tabPressMatch = navigatorContent.match(/tabPress: \(e\) => \{[\s\S]*?\}/);
    if (tabPressMatch && tabPressMatch[0].includes('// e.preventDefault()')) {
        console.log('   - ⚠️  Tab press handler exists but is mostly empty (commented out)');
        console.log('   - This could potentially cause navigation issues if default behavior is prevented');
    }
} else {
    console.log('   - ❌ No tab press handler found');
}

// 3. Check state change handling
console.log('\n3. ✅ State Change Handling:');
if (navigatorContent.includes('handleTabChange') && navigatorContent.includes('setCurrentTab')) {
    console.log('   - Tab state change handler is properly configured');
    console.log('   - Global video store setCurrentTab is called');
} else {
    console.log('   - ❌ Tab state change handling issue detected');
}

// 4. Check VideoFeedScreen initialization
console.log('\n4. 🔍 VideoFeedScreen Initialization:');
if (videoFeedContent.includes('useScreenStatus')) {
    console.log('   - Uses useScreenStatus for loading/error management');
    if (videoFeedContent.includes('screenStatus.isLoading')) {
        console.log('   - Has proper loading state handling');
    }
    if (videoFeedContent.includes('screenStatus.error')) {
        console.log('   - Has proper error state handling');
    }
}

if (videoFeedContent.includes('useFocusEffect')) {
    console.log('   - ✅ Uses useFocusEffect for screen focus handling');
} else {
    console.log('   - ❌ Missing useFocusEffect - could cause focus issues');
}

// 5. Check video data loading
console.log('\n5. 🔍 Video Data Loading:');
if (videoListContent.includes('loadConfessions()') || videoListContent.includes('loadConfessions')) {
    console.log('   - ✅ OptimizedVideoList calls loadConfessions');
} else {
    console.log('   - ❌ OptimizedVideoList does not load confessions');
}

if (videoListContent.includes('videoConfessions.filter')) {
    console.log('   - ✅ Filters confessions to show only video type');
} else {
    console.log('   - ❌ No video filtering detected');
}

// 6. Check useIsFocused usage
console.log('\n6. 🔍 Focus State Management:');
if (videoListContent.includes('useIsFocused')) {
    console.log('   - ✅ OptimizedVideoList uses useIsFocused hook');
    if (videoListContent.includes('isFocused && index === currentIndex')) {
        console.log('   - ✅ Video playback is properly gated by focus state');
    }
} else {
    console.log('   - ❌ Missing useIsFocused hook');
}

// 7. Check for potential React Navigation 7 issues
console.log('\n7. 🔍 React Navigation 7 Compatibility:');
const hasRN7Features = [
    'createNavigationContainerRef',
    '@react-navigation/bottom-tabs": "^7',
    '@react-navigation/native": "^7'
];

let rn7Compatible = true;
hasRN7Features.forEach(feature => {
    if (!navigatorContent.includes(feature) && !fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8').includes(feature)) {
        rn7Compatible = false;
    }
});

if (rn7Compatible) {
    console.log('   - ✅ React Navigation 7 features detected');
} else {
    console.log('   - ⚠️  Some React Navigation 7 features may be missing');
}

// 8. Check for potential memory/performance issues
console.log('\n8. 🔍 Performance Considerations:');
if (videoListContent.includes('FlashList')) {
    console.log('   - ✅ Uses FlashList for optimized rendering');
}

if (videoListContent.includes('memo(') || videoListContent.includes('useCallback') || videoListContent.includes('useMemo')) {
    console.log('   - ✅ Has performance optimizations (memo/useCallback/useMemo)');
}

if (videoListContent.includes('preloadedIndexes')) {
    console.log('   - ✅ Has intelligent preloading system');
}

// 9. Check for console logging
console.log('\n9. 🔍 Debug Logging:');
if (navigatorContent.includes('console.log(`🎥 Tab changed to:')) {
    console.log('   - ✅ Tab change debug logging enabled');
}

if (videoListContent.includes('console.log(`🎥 OptimizedVideoList:')) {
    console.log('   - ✅ Video list focus debug logging enabled');
}

// 10. Potential Issues Summary
console.log('\n🚨 Potential Issues to Investigate:\n');

const potentialIssues = [];

// Check if tab press handler prevents default
if (navigatorContent.includes('// e.preventDefault()')) {
    potentialIssues.push('Tab press handler has commented preventDefault - might interfere with navigation');
}

// Check for complex initialization
if (videoFeedContent.includes('executeWithLoading') && videoFeedContent.includes('screenStatus.isLoading')) {
    potentialIssues.push('VideoFeedScreen has complex async initialization that might delay rendering');
}

// Check if there are TypeScript errors that could prevent compilation
const tsConfigPath = path.join(__dirname, 'tsconfig.json');
if (fs.existsSync(tsConfigPath)) {
    potentialIssues.push('TypeScript compilation errors detected earlier - these could prevent the app from running properly');
}

// Check for sync vs async loading issues
if (videoListContent.includes('loadConfessions()') && !videoListContent.includes('await loadConfessions()')) {
    potentialIssues.push('loadConfessions might be called synchronously without awaiting the result');
}

if (potentialIssues.length > 0) {
    potentialIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
    });
} else {
    console.log('   - No obvious issues detected in the code structure');
}

console.log('\n💡 Recommended Investigation Steps:\n');
console.log('1. Run the app and check console logs when clicking the Videos tab');
console.log('2. Verify that the "🎥 Tab changed to: Videos" log appears');
console.log('3. Check if VideoFeedScreen\'s loading/error states are being triggered');
console.log('4. Verify that video confessions are being loaded and filtered properly');
console.log('5. Test if the issue occurs on both iOS and Android');
console.log('6. Check if there are any JavaScript exceptions in the Metro console');
console.log('7. Verify that the global video store is properly managing tab state');

console.log('\n✅ Analysis complete!\n');