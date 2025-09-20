#!/usr/bin/env node

/**
 * Improved script to add high-quality demo video confessions to the database
 * Uses proper public CDN-hosted videos for realistic testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_VIBECODE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure Supabase URL and key are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// High-quality demo videos with proper CDN URLs
const demoVideoConfessions = [
  {
    type: 'video',
    content: '🎬 Behind the scenes of my latest short film! The sunset shots were absolutely magical ✨ Can\'t wait to share the full project! #filmmaking #cinematography #behindthescenes #creator',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    transcription: 'An animated short film featuring beautiful cinematography and storytelling. This behind-the-scenes look showcases the creative process.',
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    is_anonymous: true,
    likes: 245,
    views: 1432
  },
  {
    type: 'video',
    content: '🎨 Creating dreamscapes with AI and traditional art! This experimental piece combines digital and physical mediums 🌌 #digitalart #aiart #creative #experimental',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    transcription: 'Experimental artistic video showcasing surreal dreamlike sequences created through innovative digital techniques.',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    is_anonymous: true,
    likes: 189,
    views: 876
  },
  {
    type: 'video',
    content: '🔥 Epic fire performance at the beach festival! The energy was incredible! Safety first though - always use professionals 🏖️ #fireperformance #festival #beach #amazing',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    transcription: 'Spectacular fire performance captured at a beach festival, showcasing skilled performers and amazing visual effects.',
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    is_anonymous: false,
    likes: 567,
    views: 2341
  },
  {
    type: 'video',
    content: '🏃‍♂️ Morning parkour session in the city! Every obstacle is an opportunity 💪 Stay motivated! #parkour #fitness #urban #motivation',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    transcription: 'High-energy parkour video showing athletic movements through urban environments with motivational commentary.',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    is_anonymous: true,
    likes: 412,
    views: 1890
  },
  {
    type: 'video',
    content: '🎮 Game development update! Working on the new boss battle mechanics. The animation system is coming together nicely! #gamedev #indiegame #unity #coding',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    transcription: 'Game development progress video showing new features, animations, and gameplay mechanics being implemented.',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    is_anonymous: false,
    likes: 298,
    views: 1123
  },
  {
    type: 'video',
    content: '🌊 Surfing at dawn when the waves are perfect! Nothing beats that morning glass 🏄‍♂️ Living the dream! #surfing #ocean #morning #waves',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    transcription: 'Beautiful surfing footage captured during golden hour, showcasing perfect wave conditions and skilled surfing techniques.',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    is_anonymous: true,
    likes: 445,
    views: 1567
  },
  {
    type: 'video',
    content: '🚗 Road trip through the mountains! The scenery is breathtaking. Adventure is out there! 🏔️ #roadtrip #adventure #mountains #travel',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    transcription: 'Scenic road trip video featuring stunning mountain landscapes and adventure highlights from the journey.',
    created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    is_anonymous: false,
    likes: 523,
    views: 1998
  },
  {
    type: 'video',
    content: '🏃‍♀️ Training for my first marathon! Week 10 progress update. The journey is tough but so rewarding! 💯 #marathon #running #fitness #training',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    transcription: 'Marathon training journey video documenting progress, challenges, and motivational moments along the way.',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    is_anonymous: true,
    likes: 356,
    views: 1445
  },
  {
    type: 'video',
    content: '🤖 Testing my new robot prototype! It can now navigate obstacles autonomously. Tech is amazing! 🔬 #robotics #tech #innovation #engineering',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    transcription: 'Futuristic robotics demonstration showcasing advanced autonomous navigation and cutting-edge technology.',
    created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    is_anonymous: false,
    likes: 678,
    views: 2456
  },
  {
    type: 'video',
    content: '🍳 Quick healthy breakfast recipe! High protein, low carb, and ready in 5 minutes! Perfect for busy mornings 🥑 #cooking #healthy #breakfast #recipe',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    transcription: 'Quick cooking tutorial demonstrating a healthy breakfast recipe with nutritional tips and time-saving techniques.',
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    is_anonymous: true,
    likes: 234,
    views: 987
  },
  {
    type: 'video',
    content: '🎸 Jamming session with the band! New song coming soon... This one\'s special 🎵 #music #band #guitar #newmusic',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    transcription: 'Band practice session featuring new music creation, instrument performances, and collaborative creative process.',
    created_at: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(),
    is_anonymous: false,
    likes: 389,
    views: 1678
  },
  {
    type: 'video',
    content: '🌟 Night sky timelapse from the desert! The Milky Way is absolutely stunning out here 🌌 #astrophotography #timelapse #stars #nature',
    video_uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    transcription: 'Stunning timelapse footage of the night sky captured in the desert, showcasing the Milky Way and celestial movements.',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    is_anonymous: true,
    likes: 567,
    views: 2123
  }
];

// Function to clear existing video confessions (optional)
async function clearExistingVideos() {
  try {
    const { data, error } = await supabase
      .from('confessions')
      .delete()
      .eq('type', 'video')
      .select('id');

    if (error) {
      console.warn('⚠️ Could not clear existing videos:', error.message);
      return 0;
    }

    return data ? data.length : 0;
  } catch (error) {
    console.warn('⚠️ Error clearing videos:', error);
    return 0;
  }
}

async function addImprovedDemoVideos() {
  console.log('🚀 Adding improved demo videos to Supabase...\n');

  try {
    // Check current video count
    console.log('1️⃣ Checking existing videos...');
    const { data: existingVideos, error: checkError } = await supabase
      .from('confessions')
      .select('id, content')
      .eq('type', 'video')
      .not('video_uri', 'is', null);

    if (checkError) {
      console.warn('⚠️ Error checking existing videos:', checkError.message);
    } else if (existingVideos && existingVideos.length > 0) {
      console.log(`📹 Found ${existingVideos.length} existing video confessions`);

      // Ask if we should clear existing videos
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Do you want to clear existing videos? (y/n): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() === 'y') {
        const cleared = await clearExistingVideos();
        console.log(`🗑️ Cleared ${cleared} existing videos`);
      }
    }

    // Add new demo videos
    console.log('\n2️⃣ Adding new demo videos...');
    const { data: insertedVideos, error: insertError } = await supabase
      .from('confessions')
      .insert(demoVideoConfessions)
      .select('id, content, likes, views, video_uri');

    if (insertError) {
      console.error('❌ Error inserting demo videos:', insertError.message);
      return;
    }

    console.log(`✅ Successfully added ${insertedVideos.length} demo videos:\n`);
    insertedVideos.forEach((video, index) => {
      const preview = video.content.substring(0, 60);
      console.log(`   ${index + 1}. ${preview}... (${video.likes} likes, ${video.views} views)`);
    });

    // Test video retrieval
    console.log('\n3️⃣ Testing video retrieval...');
    const { data: testVideos, error: testError } = await supabase
      .from('confessions')
      .select('*')
      .eq('type', 'video')
      .not('video_uri', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (testError) {
      console.error('❌ Error testing video retrieval:', testError.message);
    } else {
      console.log(`✅ Retrieved ${testVideos.length} videos successfully`);

      // Verify all videos have proper URLs
      const invalidVideos = testVideos.filter(v => !v.video_uri || !v.video_uri.startsWith('http'));
      if (invalidVideos.length > 0) {
        console.warn(`⚠️ Found ${invalidVideos.length} videos with invalid URLs`);
      } else {
        console.log('✅ All videos have valid URLs');
      }
    }

    // Test trending functionality
    console.log('\n4️⃣ Testing trending videos...');
    const { data: trendingVideos, error: trendingError } = await supabase.rpc('get_trending_secrets', {
      hours_back: 24,
      limit_count: 10
    });

    if (trendingError) {
      console.error('❌ Error testing trending function:', trendingError.message);
    } else {
      const videoTrending = trendingVideos?.filter(item => item.type === 'video') || [];
      console.log(`✅ Found ${videoTrending.length} trending videos`);
    }

    console.log('\n🎉 Demo video setup complete!');
    console.log('\n📱 Next steps:');
    console.log('1. Open your app and navigate to the Videos tab');
    console.log('2. You should see the new demo videos with proper thumbnails');
    console.log('3. Test swiping between videos');
    console.log('4. Test like/unlike functionality');
    console.log('5. Check that videos play smoothly without buffering');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
if (require.main === module) {
  addImprovedDemoVideos()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addImprovedDemoVideos };