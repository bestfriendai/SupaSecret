import { supabase } from "../lib/supabase";
import { useReportStore } from "../state/reportStore";
import { runReportsMigrationDirect, testReportsTable } from "./runReportsMigration";

/**
 * Test function to verify the report system works correctly
 * This will automatically try to set up the database if needed
 */
export async function testReportSystem() {
  console.log("🧪 Testing Report System...");

  try {
    // Test 1: Check if reports table exists, and try to create it if not
    console.log("1. Checking if reports table exists...");
    const tableExists = await testReportsTable();

    if (!tableExists) {
      console.log("📝 Reports table not found. Attempting to create it...");
      const migrationResult = await runReportsMigrationDirect();

      if (!migrationResult) {
        console.log("❌ Could not create reports table automatically.");
        console.log("📝 Please manually run the SQL migration:");
        console.log("   1. Go to https://supabase.com/dashboard/project/xhtqobjcbjgzxkgfyvdj/sql");
        console.log("   2. Copy and paste the contents of supabase/reports-migration.sql");
        console.log("   3. Run the query");
        return false;
      }
    }

    console.log("✅ Reports table exists and is accessible");

    // Test 2: Check if user is authenticated
    console.log("2. Checking authentication...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("⚠️  User not authenticated - some tests will be skipped");
      console.log("   Sign in to test report creation functionality");
      return true;
    }

    console.log("✅ User authenticated:", user.email);

    // Test 3: Check if confessions exist to report
    console.log("3. Checking for existing confessions...");
    const { data: confessions, error: confessionsError } = await supabase.from("confessions").select("id").limit(1);

    if (confessionsError) {
      console.error("❌ Error fetching confessions:", confessionsError.message);
      return false;
    }

    if (!confessions || confessions.length === 0) {
      console.log("⚠️  No confessions found - create some confessions first to test reporting");
      return true;
    }

    console.log("✅ Found confessions to test with");

    // Test 4: Test report store initialization
    console.log("4. Testing report store...");
    const reportStore = useReportStore.getState();

    if (typeof reportStore.createReport !== "function") {
      console.error("❌ Report store not properly initialized");
      return false;
    }

    console.log("✅ Report store initialized correctly");

    console.log("🎉 Report system tests completed successfully!");
    console.log("📱 You can now test the UI by:");
    console.log("   1. Tapping the flag icon next to any secret");
    console.log("   2. Selecting a report reason");
    console.log("   3. Submitting the report");
    console.log("   4. Checking that it saves to the database");

    return true;
  } catch (error) {
    console.error("❌ Unexpected error during testing:", error);
    return false;
  }
}

/**
 * Test creating a sample report (only call this manually for testing)
 */
export async function testCreateReport(confessionId: string) {
  console.log("🧪 Testing report creation...");

  try {
    const reportStore = useReportStore.getState();

    await reportStore.createReport({
      confessionId,
      reason: "inappropriate_content",
      additionalDetails: "Test report created by testCreateReport function",
    });

    console.log("✅ Report created successfully");
    return true;
  } catch (error) {
    console.error("❌ Error creating report:", error);
    return false;
  }
}

/**
 * Check report system status and provide setup instructions
 */
export function checkReportSystemStatus() {
  console.log("📋 Report System Status Check");
  console.log("=============================");
  console.log("");
  console.log("✅ Components created:");
  console.log("   - ReportModal component");
  console.log("   - Report store with Zustand");
  console.log("   - Database types updated");
  console.log("   - UI buttons added to HomeScreen and SecretDetailScreen");
  console.log("");
  console.log("📝 Manual setup required:");
  console.log("   1. Run the SQL migration in Supabase:");
  console.log("      - Go to your Supabase dashboard");
  console.log("      - Open SQL Editor");
  console.log("      - Copy and run the contents of supabase/reports-migration.sql");
  console.log("");
  console.log("🧪 To test the system:");
  console.log("   1. Run the migration SQL first");
  console.log("   2. Call testReportSystem() to verify setup");
  console.log("   3. Test the UI by tapping report buttons");
  console.log("");
}
