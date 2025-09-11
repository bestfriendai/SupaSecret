/*
  Storage object copy utility: Copy specific video files from videos bucket to confessions bucket
  
  This completes the migration after DB paths have been updated.
  
  Usage:
    node scripts/copy-storage-objects.js
  
  Required env:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
*/

const { createClient } = require("@supabase/supabase-js");

const FILES_TO_COPY = [
  "dfd3abad-7561-4e5b-a34a-4149387726ac/c34f49a0-4c81-4ff6-98cf-a0dad523f878.mp4",
  "dfd3abad-7561-4e5b-a34a-4149387726ac/2b446111-f456-4c0e-aa31-07cf61db0045.mp4",
  "dfd3abad-7561-4e5b-a34a-4149387726ac/f455add8-a64a-4258-8ad6-13f5e0049570.mp4",
];

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}. Create .env.local with ${name} and re-run.`);
  return v;
}

async function copyFile(supabase, srcBucket, dstBucket, filePath) {
  console.log(`Copying ${filePath}...`);

  // Download from source bucket
  const { data: file, error: dlErr } = await supabase.storage.from(srcBucket).download(filePath);
  if (dlErr) {
    console.error(`Failed to download ${filePath}:`, dlErr);
    throw dlErr;
  }

  // Upload to destination bucket
  const { error: upErr } = await supabase.storage.from(dstBucket).upload(filePath, file, {
    upsert: true,
    contentType: "video/mp4",
  });
  if (upErr) {
    console.error(`Failed to upload ${filePath}:`, upErr);
    throw upErr;
  }

  console.log(`✅ Copied ${filePath}`);
}

async function verifyFile(supabase, bucket, filePath) {
  const { data, error } = await supabase.storage.from(bucket).list(filePath.split("/").slice(0, -1).join("/"));
  if (error) return false;

  const fileName = filePath.split("/").pop();
  return data?.some((item) => item.name === fileName) || false;
}

(async function main() {
  const url = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`\nCopying ${FILES_TO_COPY.length} video files from videos → confessions bucket...\n`);

  let copied = 0;
  let skipped = 0;

  for (const filePath of FILES_TO_COPY) {
    try {
      // Check if already exists in destination
      const existsInDest = await verifyFile(client, "confessions", filePath);
      if (existsInDest) {
        console.log(`⏭️  Skipped ${filePath} (already exists in confessions)`);
        skipped++;
        continue;
      }

      // Check if exists in source
      const existsInSrc = await verifyFile(client, "videos", filePath);
      if (!existsInSrc) {
        console.log(`⚠️  Warning: ${filePath} not found in videos bucket`);
        continue;
      }

      await copyFile(client, "videos", "confessions", filePath);
      copied++;
    } catch (error) {
      console.error(`❌ Failed to copy ${filePath}:`, error.message);
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Copied: ${copied}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${FILES_TO_COPY.length}`);

  if (copied > 0) {
    console.log(`\n✅ Storage migration complete! Videos should now play correctly.`);
    console.log(`\nNext steps:`);
    console.log(`  1. Test video playback in the app`);
    console.log(`  2. After 1-2 weeks, consider removing files from videos bucket`);
    console.log(`  3. Eventually delete the videos bucket entirely`);
  }
})().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
