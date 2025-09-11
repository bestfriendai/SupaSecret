/**
 * Debug utilities for confession posting issues
 */

import { supabase } from "../lib/supabase";

export const debugConfessionPosting = async () => {
  console.log("🔍 Debug: Starting confession posting debug...");

  try {
    // 1. Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      console.error("❌ Auth error:", authError);
      return;
    }

    if (!user) {
      console.error("❌ No user found");
      return;
    }

    console.log("✅ User authenticated:", user.id);

    // 2. Check if we can read from confessions table
    const { data: confessions, error: readError } = await supabase
      .from("confessions")
      .select("*")
      .limit(5)
      .order("created_at", { ascending: false });

    if (readError) {
      console.error("❌ Read error:", readError);
      return;
    }

    if (__DEV__) {
      console.log("✅ Can read confessions:", confessions?.length || 0);
    }

    // 3. Try to insert a test confession
    const testConfession = {
      user_id: user.id,
      type: "text" as const,
      content: `Test confession ${Date.now()}`,
      video_uri: null,
      transcription: null,
      is_anonymous: true,
    };

    if (__DEV__) {
      console.log("📝 Inserting test confession:", testConfession);
    }

    const { data: insertData, error: insertError } = await supabase
      .from("confessions")
      .insert(testConfession)
      .select()
      .single();

    if (insertError) {
      if (__DEV__) {
        console.error("❌ Insert error:", insertError);
      }
      return;
    }

    console.log("✅ Test confession inserted:", insertData);

    // 4. Check if the confession appears in the list
    const { data: updatedConfessions, error: checkError } = await supabase
      .from("confessions")
      .select("*")
      .limit(10)
      .order("created_at", { ascending: false });

    if (checkError) {
      console.error("❌ Check error:", checkError);
      return;
    }

    const foundConfession = updatedConfessions?.find((c) => c.id === insertData.id);
    if (foundConfession) {
      console.log("✅ Test confession found in database");
    } else {
      console.error("❌ Test confession not found in database");
    }

    // 5. Clean up - delete the test confession
    const { error: deleteError } = await supabase.from("confessions").delete().eq("id", insertData.id);

    if (deleteError) {
      console.warn("⚠️ Could not delete test confession:", deleteError);
    } else {
      console.log("✅ Test confession cleaned up");
    }
  } catch (error) {
    console.error("❌ Debug error:", error);
  }
};

export const debugRealtimeSubscription = () => {
  console.log("🔍 Debug: Testing real-time subscription...");

  const channel = supabase
    .channel("debug-confessions")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "confessions",
      },
      (payload) => {
        console.log("🔄 Real-time: Received INSERT event:", payload);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "confessions",
      },
      (payload) => {
        console.log("🔄 Real-time: Received UPDATE event:", payload);
      },
    )
    .subscribe((status) => {
      console.log("🔄 Real-time subscription status:", status);
    });

  // Return cleanup function
  return () => {
    console.log("🔄 Cleaning up debug subscription");
    channel.unsubscribe();
  };
};

export const checkConfessionStoreState = async () => {
  if (!__DEV__) return;

  // This will be called from the component to check store state
  console.log("🔍 Debug: Checking confession store state...");

  try {
    // Import dynamically to avoid circular dependencies
    const { useConfessionStore } = await import("../state/confessionStore");
    const state = useConfessionStore.getState();
    console.log("📊 Store state:", {
      confessionsCount: state.confessions.length,
      isLoading: state.isLoading,
      error: state.error,
      hasMore: state.hasMore,
    });

    if (state.confessions.length > 0) {
      console.log("📝 Latest confession:", state.confessions[0]);
    }
  } catch (error) {
    console.error("❌ Error checking store state:", error);
  }
};
