#!/usr/bin/env node

/**
 * Authenticated Supabase Functions Test Suite
 * Tests all functions with proper authentication and correct parameters
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

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

async function createTestUser() {
  console.log('👤 Creating test user for authentication...');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      // Try to sign in if user already exists
      if (error.message.includes('already registered')) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });
        
        if (signInError) {
          console.log('⚠️ Could not create or sign in test user, using existing user if available');
          return null;
        }
        
        return signInData.user;
      }
      throw error;
    }
    
    return data.user;
  } catch (error) {
    console.log('⚠️ Could not create test user:', error.message);
    return null;
  }
}

async function getExistingUser() {
  console.log('🔍 Looking for existing users...');
  
  if (!adminClient) {
    console.log('⚠️ No service key available, cannot fetch existing users');
    return null;
  }
  
  try {
    const { data: users, error } = await adminClient.auth.admin.listUsers();
    
    if (error) {
      console.log('⚠️ Could not fetch users:', error.message);
      return null;
    }
    
    if (users && users.users.length > 0) {
      const user = users.users[0];
      console.log(`✅ Found existing user: ${user.id}`);
      return user;
    }
    
    return null;
  } catch (error) {
    console.log('⚠️ Error fetching users:', error.message);
    return null;
  }
}

async function testDatabaseFunctionsAuthenticated(userId) {
  console.log('\n🛠️ Testing Database Functions (Authenticated)...');
  
  // Test toggle_confession_like function
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

  // Test other functions with proper UUID
  const functionsToTest = [
    { name: 'get_unread_notification_count', args: { target_user_id: userId } },
    { name: 'has_active_membership', args: { target_user_id: userId, required_tier: 'free' } },
    { name: 'get_user_tier', args: { target_user_id: userId } },
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

async function testRowLevelSecurity(userId) {
  console.log('\n🔒 Testing Row Level Security...');
  
  try {
    // Test if user can read their own data
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows
      logTest('RLS', 'User Profile Access', 'FAIL', profileError.message);
    } else {
      logTest('RLS', 'User Profile Access', 'PASS', userProfile ? 'Can access own profile' : 'No profile found (normal)');
    }
    
    // Test if user can read confessions
    const { data: confessions, error: confessionsError } = await supabase
      .from('confessions')
      .select('*')
      .limit(1);
    
    if (confessionsError) {
      logTest('RLS', 'Confessions Access', 'FAIL', confessionsError.message);
    } else {
      logTest('RLS', 'Confessions Access', 'PASS', `Can read ${confessions.length} confessions`);
    }
    
    // Test if user can read their own likes
    const { data: userLikes, error: likesError } = await supabase
      .from('user_likes')
      .select('*')
      .eq('user_id', userId)
      .limit(5);
    
    if (likesError) {
      logTest('RLS', 'User Likes Access', 'FAIL', likesError.message);
    } else {
      logTest('RLS', 'User Likes Access', 'PASS', `Can read ${userLikes.length} user likes`);
    }
    
  } catch (error) {
    logTest('RLS', 'General RLS Test', 'FAIL', error.message);
  }
}

async function testStorageWithAuth() {
  console.log('\n📁 Testing Storage with Authentication...');
  
  try {
    // Test creating a signed URL
    const { data: confessions, error: confError } = await supabase
      .from('confessions')
      .select('video_uri')
      .not('video_uri', 'is', null)
      .limit(1);
    
    if (confError) throw confError;
    
    if (confessions && confessions.length > 0 && confessions[0].video_uri) {
      const videoPath = confessions[0].video_uri;
      
      const { data: signedUrl, error: urlError } = await supabase.storage
        .from('confessions')
        .createSignedUrl(videoPath, 3600);
      
      if (urlError) {
        logTest('Storage', 'Create Signed URL', 'FAIL', urlError.message);
      } else {
        logTest('Storage', 'Create Signed URL', 'PASS', 'Successfully created signed URL');
      }
    } else {
      logTest('Storage', 'Create Signed URL', 'PASS', 'No video files to test with (normal)');
    }
    
  } catch (error) {
    logTest('Storage', 'Storage with Auth', 'FAIL', error.message);
  }
}

async function runAuthenticatedTests() {
  console.log('🧪 Starting Authenticated Supabase Functions Verification...');
  console.log(`📍 Testing against: ${SUPABASE_URL}`);
  console.log('=' .repeat(60));

  // Try to get or create a test user
  let testUser = await createTestUser();
  
  if (!testUser) {
    testUser = await getExistingUser();
  }
  
  if (!testUser) {
    console.log('❌ Could not create or find a test user. Some tests will be skipped.');
    console.log('💡 To run authenticated tests, ensure you have a service key or create a user manually.');
    return false;
  }
  
  console.log(`✅ Using test user: ${testUser.id}\n`);
  
  // Run authenticated tests
  await testDatabaseFunctionsAuthenticated(testUser.id);
  await testRowLevelSecurity(testUser.id);
  await testStorageWithAuth();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 AUTHENTICATED TEST SUMMARY');
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

  return results.failed === 0;
}

// Run the tests
if (require.main === module) {
  runAuthenticatedTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = { runAuthenticatedTests };
