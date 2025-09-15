#!/usr/bin/env node

/**
 * Debug script for the toggle_confession_like function issue
 * This script will help diagnose the specific error you're seeing
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

async function debugLikeFunction() {
  console.log('🔍 Debugging toggle_confession_like function...\n');

  try {
    // Step 1: Check if we can connect to the database
    console.log('1️⃣ Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('confessions')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return;
    }
    console.log('✅ Database connection successful\n');

    // Step 2: Check if confessions table exists and has data
    console.log('2️⃣ Checking confessions table...');
    const { data: confessions, error: confessionsError } = await supabase
      .from('confessions')
      .select('id, likes, user_id')
      .limit(5);
    
    if (confessionsError) {
      console.error('❌ Error reading confessions:', confessionsError);
      return;
    }
    
    console.log(`✅ Found ${confessions.length} confessions`);
    if (confessions.length > 0) {
      console.log('Sample confession:', confessions[0]);
    }
    console.log();

    // Step 3: Check if the function exists
    console.log('3️⃣ Checking if toggle_confession_like function exists...');
    if (adminClient) {
      try {
        const { data: functions, error: functionsError } = await adminClient
          .from('pg_proc')
          .select('proname')
          .eq('proname', 'toggle_confession_like');
        
        if (functionsError) {
          console.log('⚠️ Could not check function existence (this is normal)');
        } else if (functions && functions.length > 0) {
          console.log('✅ Function exists in database');
        } else {
          console.log('❌ Function does not exist in database');
        }
      } catch (error) {
        console.log('⚠️ Could not check function existence:', error.message);
      }
    }
    console.log();

    // Step 4: Test the function with different parameter combinations
    console.log('4️⃣ Testing toggle_confession_like function...');
    
    if (confessions.length === 0) {
      console.log('❌ No confessions available to test with');
      return;
    }

    const testConfessionId = confessions[0].id;
    console.log(`Testing with confession ID: ${testConfessionId}`);

    // Test 1: Call with just confession_uuid (as per your error)
    console.log('\nTest 1: Calling with confession_uuid only...');
    try {
      const { data, error } = await supabase.rpc('toggle_confession_like', {
        confession_uuid: testConfessionId
      });
      
      if (error) {
        console.error('❌ Error:', error);
        console.log('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      } else {
        console.log('✅ Success:', data);
      }
    } catch (error) {
      console.error('❌ Exception:', error);
    }

    // Test 2: Check if we need user authentication
    console.log('\nTest 2: Checking authentication status...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
    } else if (user) {
      console.log('✅ User authenticated:', user.id);
      
      // Test with user_id parameter
      console.log('\nTest 3: Calling with user_id parameter...');
      try {
        const { data, error } = await supabase.rpc('toggle_confession_like', {
          confession_uuid: testConfessionId,
          user_id: user.id
        });
        
        if (error) {
          console.error('❌ Error:', error);
        } else {
          console.log('✅ Success:', data);
        }
      } catch (error) {
        console.error('❌ Exception:', error);
      }
    } else {
      console.log('⚠️ No user authenticated - this might be the issue');
      console.log('The function might require authentication to work properly');
    }

    // Step 5: Check user_likes table structure
    console.log('\n5️⃣ Checking user_likes table...');
    try {
      const { data: userLikes, error: userLikesError } = await supabase
        .from('user_likes')
        .select('*')
        .limit(3);
      
      if (userLikesError) {
        console.error('❌ Error reading user_likes:', userLikesError);
      } else {
        console.log(`✅ user_likes table accessible, ${userLikes.length} records found`);
        if (userLikes.length > 0) {
          console.log('Sample user_like:', userLikes[0]);
        }
      }
    } catch (error) {
      console.error('❌ Exception accessing user_likes:', error);
    }

    // Step 6: Manual like toggle test
    console.log('\n6️⃣ Testing manual like toggle...');
    if (user) {
      try {
        // Check if like exists
        const { data: existingLike, error: checkError } = await supabase
          .from('user_likes')
          .select('*')
          .eq('confession_id', testConfessionId)
          .eq('user_id', user.id)
          .single();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('❌ Error checking existing like:', checkError);
        } else {
          const likeExists = !checkError;
          console.log(`Current like status: ${likeExists ? 'LIKED' : 'NOT LIKED'}`);
          
          if (likeExists) {
            // Remove like
            const { error: deleteError } = await supabase
              .from('user_likes')
              .delete()
              .eq('confession_id', testConfessionId)
              .eq('user_id', user.id);
            
            if (deleteError) {
              console.error('❌ Error removing like:', deleteError);
            } else {
              console.log('✅ Successfully removed like');
            }
          } else {
            // Add like
            const { error: insertError } = await supabase
              .from('user_likes')
              .insert({
                confession_id: testConfessionId,
                user_id: user.id,
                created_at: new Date().toISOString()
              });
            
            if (insertError) {
              console.error('❌ Error adding like:', insertError);
            } else {
              console.log('✅ Successfully added like');
            }
          }
        }
      } catch (error) {
        console.error('❌ Exception in manual like toggle:', error);
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

async function suggestFixes() {
  console.log('\n🔧 SUGGESTED FIXES:');
  console.log('='.repeat(50));
  
  console.log('1. Function Missing: If the toggle_confession_like function doesn\'t exist:');
  console.log('   - Check your Supabase dashboard > Database > Functions');
  console.log('   - The function might need to be created or restored');
  
  console.log('\n2. Authentication Required: If the function requires authentication:');
  console.log('   - Make sure users are signed in before calling the function');
  console.log('   - Check if the function uses auth.uid() internally');
  
  console.log('\n3. Parameter Mismatch: If parameters are incorrect:');
  console.log('   - The function signature might expect different parameters');
  console.log('   - Check the actual function definition in Supabase');
  
  console.log('\n4. RLS Policies: If Row Level Security is blocking access:');
  console.log('   - Check RLS policies on confessions and user_likes tables');
  console.log('   - Ensure policies allow the current user to read/write');
  
  console.log('\n5. Database Permissions: If there are permission issues:');
  console.log('   - Check if the anon role has EXECUTE permissions on the function');
  console.log('   - Verify table permissions for confessions and user_likes');
}

// Run the debug
if (require.main === module) {
  debugLikeFunction()
    .then(() => suggestFixes())
    .catch(error => {
      console.error('💥 Debug script crashed:', error);
      process.exit(1);
    });
}

module.exports = { debugLikeFunction };
