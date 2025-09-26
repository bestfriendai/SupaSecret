// Simple test to verify Supabase configuration
const fs = require("fs");
const path = require("path");

// Read .env file
const envPath = path.join(__dirname, ".env");
let envContent = "";

try {
  envContent = fs.readFileSync(envPath, "utf8");
} catch (error) {
  console.log("❌ Could not read .env file");
  process.exit(1);
}

// Extract Supabase configuration
const supabaseUrlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/);
const supabaseKeyMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.log("❌ Missing Supabase configuration in .env file");
  process.exit(1);
}

const supabaseUrl = supabaseUrlMatch[1];
const supabaseKey = supabaseKeyMatch[1];

console.log("✅ Supabase Configuration Found:");
console.log("   URL:", supabaseUrl);
console.log("   Project ID:", supabaseUrl.split("/").pop()?.split(".")[0] || "Unknown");
console.log("   Key Present:", supabaseKey ? "Yes" : "No");

// Test if the URL is valid
if (supabaseUrl.startsWith("https://") && supabaseUrl.includes(".supabase.co")) {
  console.log("✅ Supabase URL format is valid");
} else {
  console.log("❌ Supabase URL format is invalid");
}

// Test if the key looks like a valid JWT
if (supabaseKey.startsWith("eyJ") && supabaseKey.includes(".")) {
  console.log("✅ Supabase key format appears valid");
} else {
  console.log("❌ Supabase key format appears invalid");
}

console.log("\n📋 Next steps:");
console.log("1. Run the app with: npx expo start");
console.log("2. Check the console for any Supabase connection errors");
console.log("3. Test authentication and database operations in the app");
