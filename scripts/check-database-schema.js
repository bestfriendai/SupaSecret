#!/usr/bin/env node

/**
 * Database Schema and Security Verification Script
 * Checks table structures, RLS policies, and function permissions
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

async function checkTableStructures() {
  console.log('📋 Checking Table Structures...\n');
  
  const tables = [
    'confessions',
    'user_likes', 
    'user_profiles',
    'notifications',
    'user_memberships',
    'reports'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Accessible (${data.length} sample records)`);
        if (data.length > 0) {
          console.log(`   Sample columns: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`❌ ${table}: ${error.message}`);
    }
  }
}

async function checkRLSPolicies() {
  console.log('\n🔒 Checking RLS Policies...\n');
  
  if (!adminClient) {
    console.log('⚠️ Service key required to check RLS policies');
    return;
  }
  
  try {
    const { data: policies, error } = await adminClient
      .from('pg_policies')
      .select('schemaname, tablename, policyname, permissive, roles, cmd, qual')
      .eq('schemaname', 'public');
    
    if (error) {
      console.log('❌ Could not fetch RLS policies:', error.message);
      return;
    }
    
    const policyCount = policies.length;
    console.log(`✅ Found ${policyCount} RLS policies`);
    
    // Group by table
    const policiesByTable = policies.reduce((acc, policy) => {
      if (!acc[policy.tablename]) acc[policy.tablename] = [];
      acc[policy.tablename].push(policy);
      return acc;
    }, {});
    
    Object.entries(policiesByTable).forEach(([table, tablePolicies]) => {
      console.log(`\n📋 ${table} (${tablePolicies.length} policies):`);
      tablePolicies.forEach(policy => {
        console.log(`   • ${policy.policyname} (${policy.cmd})`);
      });
    });
    
  } catch (error) {
    console.log('❌ Error checking RLS policies:', error.message);
  }
}

async function checkFunctionPermissions() {
  console.log('\n⚙️ Checking Function Permissions...\n');
  
  if (!adminClient) {
    console.log('⚠️ Service key required to check function permissions');
    return;
  }
  
  try {
    const { data: functions, error } = await adminClient
      .from('pg_proc')
      .select('proname, proacl, proowner')
      .in('proname', [
        'toggle_confession_like',
        'get_unread_notification_count', 
        'has_active_membership',
        'get_user_tier',
        'get_trending_hashtags'
      ]);
    
    if (error) {
      console.log('❌ Could not fetch function permissions:', error.message);
      return;
    }
    
    console.log(`✅ Found ${functions.length} custom functions`);
    
    functions.forEach(func => {
      console.log(`\n📋 ${func.proname}:`);
      console.log(`   Owner: ${func.proowner}`);
      console.log(`   ACL: ${func.proacl || 'Default permissions'}`);
    });
    
  } catch (error) {
    console.log('❌ Error checking function permissions:', error.message);
  }
}

async function checkStorageBuckets() {
  console.log('\n📁 Checking Storage Buckets...\n');
  
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('❌ Could not list buckets:', error.message);
      return;
    }
    
    console.log(`✅ Found ${buckets.length} storage buckets`);
    
    for (const bucket of buckets) {
      console.log(`\n📋 ${bucket.name}:`);
      console.log(`   Public: ${bucket.public}`);
      console.log(`   File size limit: ${bucket.file_size_limit || 'Not set'}`);
      console.log(`   Allowed MIME types: ${bucket.allowed_mime_types?.join(', ') || 'All types'}`);
      
      // Try to list files
      try {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 5 });
        
        if (filesError) {
          console.log(`   Files: Error - ${filesError.message}`);
        } else {
          console.log(`   Files: ${files.length} files found`);
        }
      } catch (error) {
        console.log(`   Files: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error checking storage buckets:', error.message);
  }
}

async function checkRealtimeConfig() {
  console.log('\n🔄 Checking Realtime Configuration...\n');
  
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('❌ Realtime connection timeout');
        resolve();
      }
    }, 5000);

    try {
      const channel = supabase
        .channel('schema-test')
        .subscribe((status) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime connection successful');
            } else {
              console.log(`⚠️ Realtime status: ${status}`);
            }
            
            channel.unsubscribe();
            resolve();
          }
        });
    } catch (error) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log('❌ Realtime connection error:', error.message);
        resolve();
      }
    }
  });
}

async function generateReport() {
  console.log('\n📊 SUPABASE CONFIGURATION REPORT');
  console.log('='.repeat(60));
  console.log(`🌐 URL: ${SUPABASE_URL}`);
  console.log(`🔑 Using Service Key: ${adminClient ? 'Yes' : 'No'}`);
  console.log(`📅 Report Generated: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  await checkTableStructures();
  await checkRLSPolicies();
  await checkFunctionPermissions();
  await checkStorageBuckets();
  await checkRealtimeConfig();
  
  console.log('\n✅ Schema verification complete!');
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('   1. Ensure all required tables are accessible');
  console.log('   2. Verify RLS policies allow appropriate access');
  console.log('   3. Check function permissions for anon role');
  console.log('   4. Test storage bucket access with authentication');
  console.log('   5. Verify realtime subscriptions work in your app');
}

// Run the schema check
if (require.main === module) {
  generateReport()
    .catch(error => {
      console.error('💥 Schema check crashed:', error);
      process.exit(1);
    });
}

module.exports = { generateReport };
