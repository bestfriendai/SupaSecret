#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function testQuery(name, queryFn) {
  try {
    console.log(`${colors.cyan}Testing: ${name}${colors.reset}`);
    const result = await queryFn();
    if (result.error) {
      console.log(`${colors.red}  ❌ Failed: ${result.error.message}${colors.reset}`);
      return false;
    }
    console.log(`${colors.green}  ✅ Success${colors.reset}`);
    if (result.data) {
      console.log(`${colors.blue}     Found ${result.data.length || 0} records${colors.reset}`);
    }
    return true;
  } catch (error) {
    console.log(`${colors.red}  ❌ Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function verifySupabaseIntegration() {
  console.log(`\n${colors.yellow}🔍 Verifying Supabase Integration${colors.reset}\n`);
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Project ID: ${supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]}\n`);

  let successCount = 0;
  let totalTests = 0;

  // Test Tables
  console.log(`${colors.yellow}📊 Testing Tables:${colors.reset}\n`);

  // 1. Test confessions table
  totalTests++;
  if (await testQuery('confessions table', () =>
    supabase.from('confessions').select('*').limit(5)
  )) successCount++;

  // 2. Test public_confessions view
  totalTests++;
  if (await testQuery('public_confessions view', () =>
    supabase.from('public_confessions').select('*').limit(5)
  )) successCount++;

  // 3. Test user_profiles table
  totalTests++;
  if (await testQuery('user_profiles table', () =>
    supabase.from('user_profiles').select('*').limit(5)
  )) successCount++;

  // 4. Test user_preferences table
  totalTests++;
  if (await testQuery('user_preferences table', () =>
    supabase.from('user_preferences').select('*').limit(5)
  )) successCount++;

  // 5. Test replies table
  totalTests++;
  if (await testQuery('replies table', () =>
    supabase.from('replies').select('*').limit(5)
  )) successCount++;

  // 6. Test user_likes table
  totalTests++;
  if (await testQuery('user_likes table', () =>
    supabase.from('user_likes').select('*').limit(5)
  )) successCount++;

  // 7. Test notifications table
  totalTests++;
  if (await testQuery('notifications table', () =>
    supabase.from('notifications').select('*').limit(5)
  )) successCount++;

  // 8. Test notification_preferences table
  totalTests++;
  if (await testQuery('notification_preferences table', () =>
    supabase.from('notification_preferences').select('*').limit(5)
  )) successCount++;

  // 9. Test reports table
  totalTests++;
  if (await testQuery('reports table', () =>
    supabase.from('reports').select('*').limit(5)
  )) successCount++;

  // 10. Test push_tokens table
  totalTests++;
  if (await testQuery('push_tokens table', () =>
    supabase.from('push_tokens').select('*').limit(5)
  )) successCount++;

  // 11. Test user_memberships table
  totalTests++;
  if (await testQuery('user_memberships table', () =>
    supabase.from('user_memberships').select('*').limit(5)
  )) successCount++;

  // 12. Test video_analytics table
  totalTests++;
  if (await testQuery('video_analytics table', () =>
    supabase.from('video_analytics').select('*').limit(5)
  )) successCount++;

  // Test Complex Queries
  console.log(`\n${colors.yellow}🔧 Testing Complex Queries:${colors.reset}\n`);

  // 13. Test video confessions with ordering
  totalTests++;
  if (await testQuery('Video confessions with ordering', () =>
    supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .order('created_at', { ascending: false })
      .limit(10)
  )) successCount++;

  // 14. Test confessions with likes
  totalTests++;
  if (await testQuery('Confessions with likes count', () =>
    supabase
      .from('confessions')
      .select('id, content, likes')
      .gt('likes', 0)
      .limit(5)
  )) successCount++;

  // Test Auth
  console.log(`\n${colors.yellow}🔐 Testing Authentication:${colors.reset}\n`);

  // 15. Test auth session
  totalTests++;
  if (await testQuery('Auth session check', async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data: data?.session ? [data.session] : [], error };
  })) successCount++;

  // Test Storage
  console.log(`\n${colors.yellow}📦 Testing Storage:${colors.reset}\n`);

  // 16. Test storage buckets
  totalTests++;
  if (await testQuery('Storage buckets', async () => {
    const { data, error } = await supabase.storage.listBuckets();
    return { data, error };
  })) successCount++;

  // Summary
  console.log(`\n${colors.yellow}📈 Summary:${colors.reset}\n`);
  const percentage = Math.round((successCount / totalTests) * 100);
  const statusColor = percentage === 100 ? colors.green : percentage >= 75 ? colors.yellow : colors.red;

  console.log(`${statusColor}Passed: ${successCount}/${totalTests} tests (${percentage}%)${colors.reset}`);

  if (successCount === totalTests) {
    console.log(`\n${colors.green}✅ All Supabase queries are working correctly!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some queries failed. Please check your database schema.${colors.reset}\n`);
  }

  return successCount === totalTests;
}

// Run the verification
verifySupabaseIntegration().then(success => {
  process.exit(success ? 0 : 1);
});