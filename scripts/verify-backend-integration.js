#!/usr/bin/env node

/**
 * Backend Integration Verification Script
 * Tests all the fixes made to align code with documented database structure
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(category, test, status, details) {
  const result = { category, test, status, details };
  results.tests.push(result);
  
  if (status === 'PASS') {
    results.passed++;
    console.log(`✅ ${category}: ${test} - ${details}`);
  } else {
    results.failed++;
    console.log(`❌ ${category}: ${test} - ${details}`);
  }
}

async function testDatabaseViews() {
  console.log('\n📋 Testing Database Views...\n');
  
  try {
    // Test public_confessions view
    const { data, error } = await supabase
      .from('public_confessions')
      .select('*')
      .limit(1);
    
    if (error) {
      logTest('Database Views', 'public_confessions', 'FAIL', error.message);
    } else {
      logTest('Database Views', 'public_confessions', 'PASS', `Accessible with ${data?.length || 0} records`);
      
      // Verify expected columns exist
      if (data && data.length > 0) {
        const expectedColumns = ['id', 'content', 'created_at', 'is_anonymous', 'likes', 'type', 'video_uri'];
        const actualColumns = Object.keys(data[0]);
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        
        if (missingColumns.length === 0) {
          logTest('Database Views', 'public_confessions columns', 'PASS', 'All expected columns present');
        } else {
          logTest('Database Views', 'public_confessions columns', 'FAIL', `Missing columns: ${missingColumns.join(', ')}`);
        }
      }
    }
  } catch (error) {
    logTest('Database Views', 'public_confessions', 'FAIL', error.message);
  }
}

async function testDatabaseFunctions() {
  console.log('\n🛠️ Testing Database Functions...\n');
  
  // Test functions that don't require authentication
  const publicFunctions = [
    { name: 'extract_hashtags', args: { text_content: 'Test #hashtag #example content' } },
    { name: 'get_trending_hashtags', args: { hours_back: 24, limit_count: 10 } }
  ];

  for (const func of publicFunctions) {
    try {
      const { data, error } = await supabase.rpc(func.name, func.args);
      if (error) {
        logTest('Database Functions', func.name, 'FAIL', error.message);
      } else {
        logTest('Database Functions', func.name, 'PASS', `Returned: ${JSON.stringify(data).substring(0, 100)}...`);
      }
    } catch (error) {
      logTest('Database Functions', func.name, 'FAIL', error.message);
    }
  }
}

async function testAuthenticatedFunctions() {
  console.log('\n🔐 Testing Authenticated Functions...\n');
  
  // Test authentication-required functions with a test user
  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';
  
  try {
    // Try to sign in with test user (or create if doesn't exist)
    let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      // Try to create test user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
      });

      if (signUpError && !signUpError.message.includes('User already registered')) {
        logTest('Authentication', 'test user setup', 'FAIL', signUpError.message);
        return;
      } else if (signUpError && signUpError.message.includes('User already registered')) {
        logTest('Authentication', 'test user setup', 'PASS', 'User already exists (expected)');
        // Try signing in again
        const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });
        if (retryError) {
          logTest('Authentication', 'test user signin retry', 'FAIL', retryError.message);
          return;
        }
        signInData = retrySignIn;
      } else {
        signInData = signUpData;
      }
    } else if (signInError) {
      logTest('Authentication', 'test user signin', 'FAIL', signInError.message);
      return;
    }
    
    if (!signInData.user) {
      logTest('Authentication', 'test user signin', 'FAIL', 'No user data returned');
      return;
    }
    
    logTest('Authentication', 'test user signin', 'PASS', `User ID: ${signInData.user.id}`);
    
    // Test toggle_confession_like function (requires authentication)
    const { data: confessions } = await supabase
      .from('public_confessions')
      .select('id')
      .limit(1);
    
    if (confessions && confessions.length > 0) {
      const confessionId = confessions[0].id;
      
      const { data: likeData, error: likeError } = await supabase.rpc('toggle_confession_like', {
        confession_uuid: confessionId
      });
      
      if (likeError) {
        logTest('Authenticated Functions', 'toggle_confession_like', 'FAIL', likeError.message);
      } else {
        // Verify return format matches documentation
        if (Array.isArray(likeData) && likeData.length > 0 && typeof likeData[0].likes_count === 'number') {
          logTest('Authenticated Functions', 'toggle_confession_like', 'PASS', `Returned likes_count: ${likeData[0].likes_count}`);
        } else {
          logTest('Authenticated Functions', 'toggle_confession_like', 'FAIL', `Unexpected return format: ${JSON.stringify(likeData)}`);
        }
      }
    } else {
      logTest('Authenticated Functions', 'toggle_confession_like', 'SKIP', 'No confessions available for testing');
    }
    
    // Test user-specific functions
    const userFunctions = [
      { name: 'get_user_tier', args: { target_user_id: signInData.user.id } },
      { name: 'has_active_membership', args: { target_user_id: signInData.user.id } },
      { name: 'get_unread_notification_count', args: { target_user_id: signInData.user.id } }
    ];
    
    for (const func of userFunctions) {
      try {
        const { data, error } = await supabase.rpc(func.name, func.args);
        if (error) {
          logTest('Authenticated Functions', func.name, 'FAIL', error.message);
        } else {
          logTest('Authenticated Functions', func.name, 'PASS', `Returned: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        logTest('Authenticated Functions', func.name, 'FAIL', error.message);
      }
    }
    
  } catch (error) {
    logTest('Authentication', 'setup', 'FAIL', error.message);
  }
}

async function testStorageBuckets() {
  console.log('\n📁 Testing Storage Buckets...\n');
  
  const expectedBuckets = ['confessions', 'images'];
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      logTest('Storage', 'list buckets', 'FAIL', error.message);
      return;
    }
    
    const bucketNames = buckets.map(b => b.name);
    
    for (const expectedBucket of expectedBuckets) {
      if (bucketNames.includes(expectedBucket)) {
        logTest('Storage', `${expectedBucket} bucket`, 'PASS', 'Bucket exists');
      } else {
        logTest('Storage', `${expectedBucket} bucket`, 'FAIL', 'Bucket missing');
      }
    }
    
  } catch (error) {
    logTest('Storage', 'bucket test', 'FAIL', error.message);
  }
}

async function testEdgeFunction() {
  console.log('\n⚡ Testing Edge Function...\n');
  
  try {
    const { data, error } = await supabase.functions.invoke('process-video', {
      body: {
        videoPath: 'test/path.mp4',
        options: {
          enableFaceBlur: true,
          enableVoiceChange: false,
          enableTranscription: true,
          quality: 'medium',
          voiceEffect: 'deep'
        }
      }
    });
    
    if (error) {
      logTest('Edge Functions', 'process-video', 'FAIL', error.message);
    } else if (data && data.success) {
      logTest('Edge Functions', 'process-video', 'PASS', 'Function responded successfully');
    } else {
      logTest('Edge Functions', 'process-video', 'FAIL', `Unexpected response: ${JSON.stringify(data)}`);
    }
    
  } catch (error) {
    logTest('Edge Functions', 'process-video', 'FAIL', error.message);
  }
}

async function generateReport() {
  console.log('\n🔍 BACKEND INTEGRATION VERIFICATION REPORT');
  console.log('='.repeat(60));
  console.log(`🌐 URL: ${SUPABASE_URL}`);
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  await testDatabaseViews();
  await testDatabaseFunctions();
  await testAuthenticatedFunctions();
  await testStorageBuckets();
  await testEdgeFunction();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`   • ${t.category}: ${t.test} - ${t.details}`));
  }
  
  console.log('\n✅ INTEGRATION VERIFICATION COMPLETE!');
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Backend integration is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the issues above.');
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  generateReport()
    .catch(error => {
      console.error('💥 Verification crashed:', error);
      process.exit(1);
    });
}

module.exports = { generateReport };
