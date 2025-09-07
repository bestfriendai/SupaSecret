import { supabase } from "../lib/supabase";

/**
 * Test database connectivity and basic operations
 */
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("🧪 Testing database connection...");

    // Test 1: Check if we can connect to Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError && authError.message !== "Auth session missing!") {
      console.error("❌ Auth connection failed:", authError);
      return false;
    }
    console.log("✅ Auth connection successful");

    // Test 2: Check if we can read confessions
    const { data: confessions, error: confessionError } = await supabase
      .from("confessions")
      .select("id, content, type, created_at")
      .limit(5);

    if (confessionError) {
      console.error("❌ Confessions query failed:", confessionError);
      return false;
    }
    console.log(`✅ Confessions query successful - found ${confessions?.length || 0} confessions`);

    // Test 3: Check if we can read replies
    const { data: replies, error: replyError } = await supabase
      .from("replies")
      .select("id, content, confession_id, created_at")
      .limit(5);

    if (replyError) {
      console.error("❌ Replies query failed:", replyError);
      return false;
    }
    console.log(`✅ Replies query successful - found ${replies?.length || 0} replies`);

    // Test 4: Check if we can read user_profiles
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, username, created_at")
      .limit(5);

    if (profileError) {
      console.error("❌ User profiles query failed:", profileError);
      return false;
    }
    console.log(`✅ User profiles query successful - found ${profiles?.length || 0} profiles`);

    // Test 5: Check if we can read user_likes
    const { data: likes, error: likesError } = await supabase
      .from("user_likes")
      .select("id, user_id, confession_id, reply_id")
      .limit(5);

    if (likesError) {
      console.error("❌ User likes query failed:", likesError);
      return false;
    }
    console.log(`✅ User likes query successful - found ${likes?.length || 0} likes`);

    console.log("🎉 All database tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Database test failed with exception:", error);
    return false;
  }
};

/**
 * Test the confession and reply stores
 */
export const testStores = async (): Promise<boolean> => {
  try {
    console.log("🧪 Testing store functionality...");

    // Import stores dynamically to avoid circular dependencies
    const { useConfessionStore } = await import("../state/confessionStore");
    const { useReplyStore } = await import("../state/replyStore");

    // Test confession store
    const confessionStore = useConfessionStore.getState();
    console.log("✅ Confession store accessible");
    console.log(`📊 Current confessions count: ${confessionStore.confessions.length}`);

    // Test reply store
    const replyStore = useReplyStore.getState();
    console.log("✅ Reply store accessible");
    console.log(`📊 Current replies count: ${Object.keys(replyStore.replies).length} confession threads`);

    console.log("🎉 All store tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Store test failed:", error);
    return false;
  }
};

/**
 * Run all tests
 */
export const runAllTests = async (): Promise<void> => {
  console.log("🚀 Starting SupaSecret app tests...\n");

  const dbTest = await testDatabaseConnection();
  const storeTest = await testStores();

  console.log("\n📋 Test Results:");
  console.log(`Database Connection: ${dbTest ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Store Functionality: ${storeTest ? "✅ PASS" : "❌ FAIL"}`);

  if (dbTest && storeTest) {
    console.log("\n🎉 All tests passed! SupaSecret app is ready to use.");
  } else {
    console.log("\n⚠️  Some tests failed. Please check the errors above.");
  }
};
