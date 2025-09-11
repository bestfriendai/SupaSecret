import { supabase } from "../lib/supabase";

/**
 * Lightweight backend connectivity checks used by SettingsScreen in __DEV__.
 * Keep fast and read-only.
 */
export async function runAllTests(): Promise<void> {
  if (!__DEV__) return;

  try {
    console.log("[DB-TEST] Starting Supabase connectivity tests...");

    if (!supabase) {
      console.warn("[DB-TEST] Supabase client not initialized (missing env?)");
      return;
    }

    // 1) Auth session check
    const sessionRes = await supabase.auth.getSession();
    console.log("[DB-TEST] Session:", sessionRes?.data?.session ? "present" : "none");

    // 2) Ping a lightweight table or function (read-only)
    // Try selecting a single row from confessions (public content)
    const { data: conf, error: confErr } = await supabase.from("confessions").select("id, created_at").limit(1);

    if (confErr) {
      console.warn("[DB-TEST] Read from confessions failed:", confErr.message);
    } else {
      console.log("[DB-TEST] Read from confessions OK:", conf?.length || 0, "row(s)");
    }

    console.log("[DB-TEST] All tests completed.");
  } catch (e: any) {
    console.error("[DB-TEST] Unexpected error:", e?.message || e);
  }
}
