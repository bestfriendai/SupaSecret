/*
  Migration tool: Copy objects from 'videos' bucket to 'confessions' bucket and optionally update DB paths.
  Usage:
    node scripts/migrate-videos-to-confessions.js --dry-run                 # inventory only (default)
    node scripts/migrate-videos-to-confessions.js --execute                 # copy storage objects
    node scripts/migrate-videos-to-confessions.js --execute --update-db     # copy + update DB paths
    node scripts/migrate-videos-to-confessions.js --prefix=user123          # restrict to prefix

  Required env (do NOT commit secrets):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
  Optional env:
    CONFESSIONS_TABLE (default: confessions)
    VIDEO_URI_COLUMN (default: video_uri)
    BATCH_SIZE (default: 100)
*/

const { createClient } = require("@supabase/supabase-js");

function parseArgs() {
  const args = process.argv.slice(2);
  const has = (k) => args.includes(k);
  const getKV = (k, def) => {
    const p = args.find((a) => a.startsWith(`${k}=`));
    return p ? p.split("=").slice(1).join("=") : def;
  };
  return {
    dryRun: has("--dry-run") || (!has("--execute") && !has("--dry-run")),
    execute: has("--execute"),
    updateDb: has("--update-db"),
    prefix: getKV("--prefix", ""),
    batchSize: Number(getKV("--batch", process.env.BATCH_SIZE || "100")) || 100,
  };
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}. Create .env.local with ${name} and re-run.`);
  return v;
}

function guessContentType(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".avi")) return "video/x-msvideo";
  return undefined;
}

async function listFolder(supabase, bucket, prefix) {
  let offset = 0;
  const limit = 100;
  const files = [];
  const folders = [];
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const it of data) {
      // Heuristic: folders usually have no metadata/size
      const isFolder = !it.metadata || typeof it.metadata.size !== "number";
      if (isFolder) folders.push(it.name);
      else files.push({ name: it.name, size: it.metadata.size, mimetype: it.metadata.mimetype });
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return { files, folders };
}

async function walkAllFiles(supabase, bucket, basePrefix = "") {
  const stack = [basePrefix];
  const all = [];
  while (stack.length) {
    const cur = stack.pop();
    const { files, folders } = await listFolder(supabase, bucket, cur);
    for (const f of files) {
      const path = cur ? `${cur}/${f.name}` : f.name;
      all.push({ path, size: f.size, mimetype: f.mimetype });
    }
    for (const folder of folders) {
      const next = cur ? `${cur}/${folder}` : folder;
      stack.push(next);
    }
  }
  return all;
}

async function copyObjects(supabase, srcBucket, dstBucket, objects, batchSize = 50) {
  let copied = 0;
  for (let i = 0; i < objects.length; i += batchSize) {
    const batch = objects.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (obj) => {
        const { data: file, error: dlErr } = await supabase.storage.from(srcBucket).download(obj.path);
        if (dlErr) throw dlErr;
        const contentType = obj.mimetype || guessContentType(obj.path);
        const { error: upErr } = await supabase.storage
          .from(dstBucket)
          .upload(obj.path, file, { upsert: true, contentType });
        if (upErr) throw upErr;
        copied++;
        if (copied % 25 === 0) console.log(`[copy] ${copied}/${objects.length} files...`);
      }),
    );
  }
  return copied;
}

async function updateDbPaths(supabase, table, column, batchSize = 500) {
  let updated = 0;
  let page = 0;
  for (;;) {
    const from = page * batchSize;
    const to = from + batchSize - 1;
    const { data: rows, error } = await supabase
      .from(table)
      .select(`id, ${column}`)
      .like(column, "videos/%")
      .range(from, to);
    if (error) throw error;
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      const oldVal = row[column];
      const newVal = typeof oldVal === "string" ? oldVal.replace(/^videos\//, "confessions/") : oldVal;
      if (oldVal !== newVal) {
        const { error: upErr } = await supabase
          .from(table)
          .update({ [column]: newVal })
          .eq("id", row.id);
        if (upErr) throw upErr;
        updated++;
      }
    }
    if (rows.length < batchSize) break;
    page++;
  }
  return updated;
}

(async function main() {
  const args = parseArgs();
  const url = requireEnv("SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const table = process.env.CONFESSIONS_TABLE || "confessions";
  const column = process.env.VIDEO_URI_COLUMN || "video_uri";
  const client = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log(`\nMigration plan: videos → confessions`);
  console.log(`  dryRun: ${args.dryRun}`);
  console.log(`  execute(copy): ${args.execute}`);
  console.log(`  updateDb: ${args.updateDb}`);
  console.log(`  prefix: '${args.prefix}'  batchSize: ${args.batchSize}`);

  console.log(`\n[1/3] Inventory (read-only)…`);
  const objects = await walkAllFiles(client, "videos", args.prefix);
  const total = objects.length;
  const bytes = objects.reduce((a, b) => a + (b.size || 0), 0);
  console.log(`Found ${total} files in videos/${args.prefix || ""} (approx ${(bytes / (1024 * 1024)).toFixed(1)} MB).`);
  console.log(
    `Sample:`,
    objects.slice(0, 5).map((o) => o.path),
  );

  if (args.dryRun) {
    console.log(`\nDry-run complete. No changes performed.`);
    console.log(`Re-run with --execute to copy storage objects. Optionally add --update-db to rewrite DB paths.`);
    return;
  }

  if (!args.execute) {
    console.error(`Nothing to do. Use --dry-run or --execute.`);
    process.exit(1);
  }

  console.log(`\n[2/3] Copying storage objects videos → confessions…`);
  const copied = await copyObjects(client, "videos", "confessions", objects, Math.min(args.batchSize, 50));
  console.log(`Copied ${copied}/${total} files.`);

  if (args.updateDb) {
    console.log(`\n[3/3] Updating DB paths in ${table}.${column} from 'videos/' → 'confessions/'…`);
    const updated = await updateDbPaths(client, table, column, 500);
    console.log(`Updated ${updated} rows.`);
  }

  console.log(`\nDone.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
