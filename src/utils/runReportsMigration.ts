import { supabase } from "../lib/supabase";

/**
 * Run the reports table migration directly from the app
 * This function can be called from your app to create the reports table
 */
export async function runReportsMigration(): Promise<boolean> {
  if (__DEV__) {
    console.warn(
      "[runReportsMigration] Client-side migrations are disabled. Please run SQL migrations via Supabase migrations or the Dashboard."
    );
  }
  return false;
}

/**
 * Alternative migration approach using direct SQL execution
 * Use this if the exec_sql RPC function is not available
 */
export async function runReportsMigrationDirect(): Promise<boolean> {
  if (__DEV__) {
    console.warn(
      "[runReportsMigrationDirect] Disabled. Use server-side migrations instead (SQL files / Supabase Dashboard)."
    );
  }
  return false;
}

/**
 * Test the reports table setup
 */
export async function testReportsTable(): Promise<boolean> {
  console.log("🧪 Testing reports table...");

  try {
    // Test if we can query the reports table
    const { data, error } = await supabase.from("reports").select("id").limit(1);

    if (error) {
      console.error("❌ Reports table test failed:", error);
      return false;
    }

    console.log("✅ Reports table is accessible!");
    return true;
  } catch (error) {
    console.error("❌ Reports table test error:", error);
    return false;
  }
}
