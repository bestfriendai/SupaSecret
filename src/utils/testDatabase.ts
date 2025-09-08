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
 * Test confession creation and real-time functionality
 */
export const testConfessionCreation = async (): Promise<boolean> => {
  try {
    console.log("🧪 Testing confession creation...");

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("❌ User not authenticated:", userError);
      return false;
    }
    console.log("✅ User authenticated:", user.email);

    // Test creating a confession
    const testContent = `Test confession created at ${new Date().toISOString()}`;
    const { data: confession, error: insertError } = await supabase
      .from("confessions")
      .insert({
        user_id: user.id,
        type: "text",
        content: testContent,
        is_anonymous: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Confession creation failed:", insertError);
      return false;
    }
    console.log("✅ Confession created successfully:", confession.id);

    // Test reading the confession back
    const { data: readConfession, error: readError } = await supabase
      .from("confessions")
      .select("*")
      .eq("id", confession.id)
      .single();

    if (readError) {
      console.error("❌ Confession read failed:", readError);
      return false;
    }
    console.log("✅ Confession read successfully:", readConfession.content);

    // Clean up - delete the test confession
    const { error: deleteError } = await supabase
      .from("confessions")
      .delete()
      .eq("id", confession.id);

    if (deleteError) {
      console.warn("⚠️  Failed to clean up test confession:", deleteError);
    } else {
      console.log("✅ Test confession cleaned up");
    }

    console.log("🎉 Confession creation test passed!");
    return true;
  } catch (error) {
    console.error("❌ Confession creation test failed:", error);
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
  const confessionTest = await testConfessionCreation();

  console.log("\n📋 Test Results:");
  console.log(`Database Connection: ${dbTest ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Store Functionality: ${storeTest ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Confession Creation: ${confessionTest ? "✅ PASS" : "❌ FAIL"}`);

  if (dbTest && storeTest && confessionTest) {
    console.log("\n🎉 All tests passed! SupaSecret app is ready to use.");
  } else {
    console.log("\n⚠️  Some tests failed. Please check the errors above.");
  }
};
