const { createClient } = require("@supabase/supabase-js");

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = "https://xhtqobjcbjgzxkgfyvdj.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // You'll need to set this

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createBuckets() {
  try {
    console.log("Creating storage buckets...");

    // Create videos bucket
    const { data: videosData, error: videosError } = await supabase.storage.createBucket("videos", {
      public: false,
      fileSizeLimit: 104857600, // 100MiB
      allowedMimeTypes: ["video/mp4", "video/quicktime", "video/x-msvideo"],
    });

    if (videosError) {
      console.log("Videos bucket creation result:", videosError.message);
    } else {
      console.log("✅ Videos bucket created successfully");
    }

    // Create images bucket
    const { data: imagesData, error: imagesError } = await supabase.storage.createBucket("images", {
      public: false,
      fileSizeLimit: 10485760, // 10MiB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });

    if (imagesError) {
      console.log("Images bucket creation result:", imagesError.message);
    } else {
      console.log("✅ Images bucket created successfully");
    }

    // Create avatars bucket
    const { data: avatarsData, error: avatarsError } = await supabase.storage.createBucket("avatars", {
      public: false,
      fileSizeLimit: 5242880, // 5MiB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });

    if (avatarsError) {
      console.log("Avatars bucket creation result:", avatarsError.message);
    } else {
      console.log("✅ Avatars bucket created successfully");
    }

    console.log("Bucket creation process completed!");
  } catch (error) {
    console.error("Error creating buckets:", error);
  }
}

createBuckets();
