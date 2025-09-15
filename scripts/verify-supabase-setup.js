#!/usr/bin/env node

/**
 * Comprehensive Supabase Setup Verification Script
 * Tests all functionality after CLI setup and synchronization
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

function logTest(category, name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  const message = `${icon} [${category}] ${name}`;
  console.log(details ? `${message}: ${details}` : message);
  
  results.tests.push({ category, name, status, details });
  if (status === 'PASS') results.passed++;
  else results.failed++;
}

async function testDatabaseConnection() {
  console.log('🔗 Testing Database Connection...\n');
  
  try {
    const { data, error } = await supabase.from('confessions').select('count').limit(1);
    if (error) throw error;
    logTest('Database', 'Connection', 'PASS', 'Successfully connected');
  } catch (error) {
    logTest('Database', 'Connection', 'FAIL', error.message);
  }
}

async function testUpdatedDatabaseFunctions() {
  console.log('🛠️ Testing Updated Database Functions...\n');
  
  // Test all functions from the new database types
  const functionsToTest = [
    { name: 'extract_hashtags', args: { text_content: 'This is a #test #hashtag example' } },
    { name: 'get_trending_hashtags', args: { hours_back: 24, limit_count: 10 } },
    { name: 'get_trending_secrets', args: { hours_back: 24, limit_count: 5 } },
    { name: 'search_confessions_by_hashtag', args: { search_hashtag: 'test' } }
  ];

  for (const func of functionsToTest) {
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

async function testStorageBuckets() {
  console.log('📁 Testing Storage Buckets...\n');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    
    const expectedBuckets = ['confessions', 'images', 'videos', 'avatars'];
    const foundBuckets = buckets.map(b => b.name);
    
    for (const expectedBucket of expectedBuckets) {
      if (foundBuckets.includes(expectedBucket)) {
        logTest('Storage', `${expectedBucket} bucket`, 'PASS', 'Bucket exists');
      } else {
        logTest('Storage', `${expectedBucket} bucket`, 'FAIL', 'Bucket missing');
      }
    }
    
    // Test file operations on confessions bucket
    try {
      const { data: files, error: filesError } = await supabase.storage
        .from('confessions')
        .list('', { limit: 5 });
      
      if (filesError) {
        logTest('Storage', 'List files in confessions', 'FAIL', filesError.message);
      } else {
        logTest('Storage', 'List files in confessions', 'PASS', `Found ${files.length} files`);
      }
    } catch (error) {
      logTest('Storage', 'List files in confessions', 'FAIL', error.message);
    }
    
  } catch (error) {
    logTest('Storage', 'List buckets', 'FAIL', error.message);
  }
}

async function testEdgeFunction() {
  console.log('⚡ Testing Edge Function...\n');
  
  try {
    const { data, error } = await supabase.functions.invoke('process-video', {
      body: {
        videoUrl: 'test-video-url',
        options: {
          enableFaceBlur: true,
          enableVoiceChange: false,
          enableTranscription: true
        }
      }
    });
    
    if (error) {
      logTest('Edge Functions', 'process-video', 'FAIL', error.message);
    } else {
      logTest('Edge Functions', 'process-video', 'PASS', `Response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('Edge Functions', 'process-video', 'FAIL', error.message);
  }
}

async function testAuthenticatedFunctions() {
  console.log('🔐 Testing Authenticated Functions...\n');
  
  // Create a test user for authentication
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Sign up test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError && !signUpError.message.includes('already registered')) {
      throw signUpError;
    }
    
    // Sign in test user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (signInError) {
      throw signInError;
    }
    
    logTest('Authentication', 'User sign-in', 'PASS', `User: ${signInData.user.id}`);
    
    // Test authenticated functions
    const authFunctions = [
      { name: 'get_unread_notification_count', args: { target_user_id: signInData.user.id } },
      { name: 'has_active_membership', args: { target_user_id: signInData.user.id, required_tier: 'free' } },
      { name: 'get_user_tier', args: { target_user_id: signInData.user.id } }
    ];

    for (const func of authFunctions) {
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
    
    // Test toggle_confession_like with authentication
    try {
      const { data: confessions, error: confError } = await supabase
        .from('confessions')
        .select('id')
        .limit(1);
      
      if (confError) throw confError;
      
      if (confessions && confessions.length > 0) {
        const confessionId = confessions[0].id;
        
        const { data, error } = await supabase.rpc('toggle_confession_like', {
          confession_uuid: confessionId
        });
        
        if (error) {
          logTest('Authenticated Functions', 'toggle_confession_like', 'FAIL', error.message);
        } else {
          logTest('Authenticated Functions', 'toggle_confession_like', 'PASS', `Returned: ${JSON.stringify(data)}`);
        }
      }
    } catch (error) {
      logTest('Authenticated Functions', 'toggle_confession_like', 'FAIL', error.message);
    }
    
    // Clean up
    await supabase.auth.signOut();
    logTest('Authentication', 'User sign-out', 'PASS', 'Successfully signed out');
    
  } catch (error) {
    logTest('Authentication', 'Authentication flow', 'FAIL', error.message);
  }
}

async function testRealtime() {
  console.log('🔄 Testing Real-time Subscriptions...\n');
  
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        logTest('Real-time', 'Subscription', 'FAIL', 'Timeout after 5 seconds');
        resolve();
      }
    }, 5000);

    try {
      const channel = supabase
        .channel('verification-test')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'confessions'
        }, (payload) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            logTest('Real-time', 'Subscription', 'PASS', 'Successfully received real-time event');
            channel.unsubscribe();
            resolve();
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            logTest('Real-time', 'Subscription', 'PASS', 'Successfully subscribed to real-time channel');
            channel.unsubscribe();
            resolve();
          }
        });
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        logTest('Real-time', 'Subscription', 'FAIL', error.message);
        resolve();
      }
    }
  });
}

async function generateVerificationReport() {
  console.log('🔍 SUPABASE SETUP VERIFICATION REPORT');
  console.log('='.repeat(60));
  console.log(`🌐 URL: ${SUPABASE_URL}`);
  console.log(`📅 Verification Date: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  await testDatabaseConnection();
  await testUpdatedDatabaseFunctions();
  await testStorageBuckets();
  await testEdgeFunction();
  await testAuthenticatedFunctions();
  await testRealtime();
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`   • [${t.category}] ${t.name}: ${t.details}`));
  }

  console.log('\n🎉 SETUP STATUS:');
  if (results.failed === 0) {
    console.log('✅ All systems operational! Your Supabase setup is perfect.');
  } else if (results.failed <= 2) {
    console.log('⚠️ Minor issues detected. Most functionality is working.');
  } else {
    console.log('❌ Multiple issues detected. Review failed tests above.');
  }
  
  return results.failed === 0;
}

// Run the verification
if (require.main === module) {
  generateVerificationReport()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Verification script crashed:', error);
      process.exit(1);
    });
}

module.exports = { generateVerificationReport };
