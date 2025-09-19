#!/usr/bin/env node

/**
 * Script to add sample video confessions to the database
 * This will help test the TikTok-style video feed with real data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  console.error('Please ensure Supabase URL and key are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample video confessions data
const sampleVideoConfessions = [
  {
    type: 'video',
    content: 'Check out this amazing sunset! 🌅 The colors are absolutely breathtaking. Nature never fails to amaze me. #nature #sunset #beautiful #peaceful',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    transcription: 'This is a beautiful sunset video with amazing colors painting the sky. The peaceful atmosphere and natural beauty create a perfect moment of tranquility.',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    is_anonymous: true,
    likes: 42,
    views: 156
  },
  {
    type: 'video',
    content: 'Dancing in the rain! 💃 Sometimes you just have to let loose and enjoy life. Who cares if you get wet? #dance #fun #rain #happiness #yolo',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    transcription: 'A fun dance video in the rain showing pure joy and freedom. The energy is infectious and reminds us to embrace spontaneous moments.',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    is_anonymous: true,
    likes: 89,
    views: 234
  },
  {
    type: 'video',
    content: 'Cooking my favorite pasta recipe! 👨‍🍳 This has been in my family for generations. The secret ingredient is love (and a lot of garlic). #cooking #food #recipe #pasta #family',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    transcription: 'Step by step cooking tutorial for delicious pasta. Watch as I prepare this traditional family recipe with fresh ingredients and time-honored techniques.',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    is_anonymous: true,
    likes: 67,
    views: 189
  },
  {
    type: 'video',
    content: 'Morning workout complete! 💪 Started my day with a 5K run and some strength training. Feeling energized and ready to conquer the day! #fitness #motivation #workout #health #morning',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    transcription: 'High-energy workout video showing morning exercise routine. Demonstrates various exercises and motivational tips for staying fit and healthy.',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    is_anonymous: true,
    likes: 123,
    views: 298
  },
  {
    type: 'video',
    content: 'Exploring hidden gems in the city! 🏙️ Found this amazing street art and cozy café tucked away in an alley. Sometimes the best adventures are right in your backyard. #travel #explore #city #streetart #adventure',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    transcription: 'Urban exploration video showcasing hidden spots in the city. Features beautiful street art, local culture, and the excitement of discovering new places.',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    is_anonymous: true,
    likes: 78,
    views: 167
  }
];

async function addSampleVideoConfessions() {
  console.log('🚀 Adding sample video confessions to the database...\n');

  try {
    // First, check if we need to add missing columns
    console.log('1️⃣ Checking database schema...');
    
    // Check if confessions table exists and has the required columns
    const { data: tableInfo, error: tableError } = await supabase
      .from('confessions')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error accessing confessions table:', tableError.message);
      return;
    }

    console.log('✅ Confessions table accessible');

    // Check if there are already video confessions
    const { data: existingVideos, error: checkError } = await supabase
      .from('confessions')
      .select('id, content')
      .eq('type', 'video')
      .not('video_uri', 'is', null);

    if (checkError) {
      console.warn('⚠️ Error checking existing videos:', checkError.message);
    } else if (existingVideos && existingVideos.length > 0) {
      console.log(`📹 Found ${existingVideos.length} existing video confessions`);
      console.log('Existing videos:');
      existingVideos.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.content.substring(0, 50)}...`);
      });
      console.log('');
    }

    // Add the sample video confessions
    console.log('2️⃣ Adding sample video confessions...');
    
    const { data: insertedConfessions, error: insertError } = await supabase
      .from('confessions')
      .insert(sampleVideoConfessions)
      .select('id, content, likes, views');

    if (insertError) {
      console.error('❌ Error inserting sample confessions:', insertError.message);
      return;
    }

    console.log(`✅ Successfully added ${insertedConfessions.length} sample video confessions:`);
    insertedConfessions.forEach((confession, index) => {
      console.log(`   ${index + 1}. ${confession.content.substring(0, 50)}... (${confession.likes} likes, ${confession.views} views)`);
    });

    // Test the like function
    console.log('\n3️⃣ Testing like functionality...');
    if (insertedConfessions.length > 0) {
      const testConfessionId = insertedConfessions[0].id;
      
      const { data: likeResult, error: likeError } = await supabase.rpc('toggle_confession_like', {
        confession_uuid: testConfessionId
      });

      if (likeError) {
        console.error('❌ Error testing like function:', likeError.message);
      } else {
        console.log(`✅ Like function test successful: ${likeResult ? 'Liked' : 'Unliked'}`);
      }
    }

    // Test the views function
    console.log('\n4️⃣ Testing views functionality...');
    if (insertedConfessions.length > 0) {
      const testConfessionId = insertedConfessions[0].id;
      
      const { data: viewResult, error: viewError } = await supabase.rpc('increment_video_views', {
        confession_uuid: testConfessionId
      });

      if (viewError) {
        console.error('❌ Error testing views function:', viewError.message);
      } else {
        console.log(`✅ Views function test successful: ${viewResult}`);
      }
    }

    // Test trending function
    console.log('\n5️⃣ Testing trending videos...');
    const { data: trendingVideos, error: trendingError } = await supabase.rpc('get_trending_secrets', {
      hours_back: 24,
      limit_count: 5
    });

    if (trendingError) {
      console.error('❌ Error testing trending function:', trendingError.message);
    } else {
      const videoTrending = trendingVideos?.filter(item => item.type === 'video') || [];
      console.log(`✅ Trending function test successful: Found ${videoTrending.length} trending videos`);
    }

    console.log('\n🎉 Sample video confessions setup complete!');
    console.log('You can now test the TikTok-style video feed with real data.');
    console.log('\nNext steps:');
    console.log('1. Open your app and navigate to the Videos tab');
    console.log('2. You should see the sample videos in the feed');
    console.log('3. Test swiping, liking, and other interactions');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
if (require.main === module) {
  addSampleVideoConfessions()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addSampleVideoConfessions };
