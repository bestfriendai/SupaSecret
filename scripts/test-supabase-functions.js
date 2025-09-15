#!/usr/bin/env node

/**
 * Comprehensive Supabase Functions Test Suite
 * Tests all database functions, edge functions, auth, real-time, storage, and API endpoints
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   EXPO_PUBLIC_VIBECODE_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL');
  console.error('   EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = SUPABASE_SERVICE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY) : null;

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
  console.log('\n🔗 Testing Database Connection...');
  
  try {
    const { data, error } = await supabase.from('confessions').select('count').limit(1);
    if (error) throw error;
    logTest('Database', 'Connection', 'PASS', 'Successfully connected to database');
  } catch (error) {
    logTest('Database', 'Connection', 'FAIL', error.message);
  }
}

async function testDatabaseFunctions() {
  console.log('\n🛠️ Testing Database Functions...');
  
  // Test toggle_confession_like function
  try {
    // First, get a confession ID to test with
    const { data: confessions, error: confError } = await supabase
      .from('confessions')
      .select('id')
      .limit(1);
    
    if (confError) throw confError;
    
    if (confessions && confessions.length > 0) {
      const confessionId = confessions[0].id;
      
      // Test the function that's failing in your error
      const { data, error } = await supabase.rpc('toggle_confession_like', {
        confession_uuid: confessionId
      });
      
      if (error) {
        logTest('Database Functions', 'toggle_confession_like', 'FAIL', error.message);
      } else {
        logTest('Database Functions', 'toggle_confession_like', 'PASS', `Returned: ${JSON.stringify(data)}`);
      }
    } else {
      logTest('Database Functions', 'toggle_confession_like', 'FAIL', 'No confessions found to test with');
    }
  } catch (error) {
    logTest('Database Functions', 'toggle_confession_like', 'FAIL', error.message);
  }

  // Test other functions
  const functionsToTest = [
    { name: 'get_unread_notification_count', args: { target_user_id: 'test-user-id' } },
    { name: 'has_active_membership', args: { target_user_id: 'test-user-id' } },
    { name: 'get_user_tier', args: { target_user_id: 'test-user-id' } },
    { name: 'get_trending_hashtags', args: { hours_back: 24, limit_count: 10 } }
  ];

  for (const func of functionsToTest) {
    try {
      const { data, error } = await supabase.rpc(func.name, func.args);
      if (error) {
        logTest('Database Functions', func.name, 'FAIL', error.message);
      } else {
        logTest('Database Functions', func.name, 'PASS', `Returned: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      logTest('Database Functions', func.name, 'FAIL', error.message);
    }
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  try {
    // Test getting current session
    const { data: session, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (session.session) {
      logTest('Authentication', 'Session Check', 'PASS', `User: ${session.session.user.id}`);
    } else {
      logTest('Authentication', 'Session Check', 'PASS', 'No active session (expected for test)');
    }
  } catch (error) {
    logTest('Authentication', 'Session Check', 'FAIL', error.message);
  }
}

async function testRealtime() {
  console.log('\n🔄 Testing Real-time Subscriptions...');
  
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
        .channel('test-channel')
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

async function testStorage() {
  console.log('\n📁 Testing Storage Functions...');
  
  try {
    // Test listing buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) throw bucketsError;
    
    logTest('Storage', 'List Buckets', 'PASS', `Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}`);
    
    // Test listing files in confessions bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('confessions')
      .list('', { limit: 5 });
    
    if (filesError) {
      logTest('Storage', 'List Files', 'FAIL', filesError.message);
    } else {
      logTest('Storage', 'List Files', 'PASS', `Found ${files.length} files in confessions bucket`);
    }
  } catch (error) {
    logTest('Storage', 'Storage Operations', 'FAIL', error.message);
  }
}

async function testEdgeFunctions() {
  console.log('\n⚡ Testing Edge Functions...');
  
  try {
    // Test the process-video edge function
    const { data, error } = await supabase.functions.invoke('process-video', {
      body: {
        videoUrl: 'test-url',
        options: {
          enableFaceBlur: false,
          enableVoiceChange: false,
          enableTranscription: false
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

async function testAPIEndpoints() {
  console.log('\n🌐 Testing API Endpoints...');
  
  const endpoints = [
    { table: 'confessions', operation: 'select' },
    { table: 'user_profiles', operation: 'select' },
    { table: 'notifications', operation: 'select' },
    { table: 'reports', operation: 'select' }
  ];

  for (const endpoint of endpoints) {
    try {
      const { data, error } = await supabase
        .from(endpoint.table)
        .select('*')
        .limit(1);
      
      if (error) {
        logTest('API Endpoints', `${endpoint.table} ${endpoint.operation}`, 'FAIL', error.message);
      } else {
        logTest('API Endpoints', `${endpoint.table} ${endpoint.operation}`, 'PASS', `Retrieved ${data.length} records`);
      }
    } catch (error) {
      logTest('API Endpoints', `${endpoint.table} ${endpoint.operation}`, 'FAIL', error.message);
    }
  }
}

async function runAllTests() {
  console.log('🧪 Starting Supabase Functions Verification...');
  console.log(`📍 Testing against: ${SUPABASE_URL}`);
  console.log('=' .repeat(60));

  await testDatabaseConnection();
  await testDatabaseFunctions();
  await testAuthentication();
  await testRealtime();
  await testStorage();
  await testEdgeFunctions();
  await testAPIEndpoints();

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
      .forEach(t => console.log(`   • [${t.category}] ${t.name}: ${t.details}`));
  }

  console.log('\n🔍 For detailed analysis, check the individual test results above.');
  
  return results.failed === 0;
}

// Run the tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
