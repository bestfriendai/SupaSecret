import { supabase } from "../lib/supabase";
import { useAuthStore } from "../state/authStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Test authentication persistence and state management
 */
export const testAuthPersistence = async (): Promise<void> => {
  console.log("🧪 Testing authentication persistence...\n");

  try {
    // Test 1: Check Supabase session
    console.log("1️⃣ Checking Supabase session...");
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("❌ Session error:", sessionError);
    } else if (session) {
      console.log("✅ Active session found:", {
        user: session.user.email,
        expiresAt: new Date(session.expires_at! * 1000).toLocaleString(),
        accessToken: session.access_token ? "present" : "missing",
      });
    } else {
      console.log("ℹ️  No active session");
    }

    // Test 2: Check current user
    console.log("\n2️⃣ Checking current user...");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("❌ User error:", userError);
    } else if (user) {
      console.log("✅ Current user found:", {
        id: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at ? "yes" : "no",
        lastSignIn: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "never",
      });
    } else {
      console.log("ℹ️  No current user");
    }

    // Test 3: Check AsyncStorage auth data
    console.log("\n3️⃣ Checking AsyncStorage auth data...");
    const storedAuthData = await AsyncStorage.getItem("auth-storage");

    if (storedAuthData) {
      try {
        const parsedData = JSON.parse(storedAuthData);
        console.log("✅ Stored auth data found:", {
          hasUser: !!parsedData.state?.user,
          isAuthenticated: parsedData.state?.isAuthenticated,
          userEmail: parsedData.state?.user?.email,
          userOnboarded: parsedData.state?.user?.isOnboarded,
        });
      } catch (parseError) {
        console.error("❌ Failed to parse stored auth data:", parseError);
      }
    } else {
      console.log("ℹ️  No stored auth data found");
    }

    // Test 4: Check Zustand store state
    console.log("\n4️⃣ Checking Zustand store state...");
    const storeState = useAuthStore.getState();
    console.log("✅ Current store state:", {
      isAuthenticated: storeState.isAuthenticated,
      hasUser: !!storeState.user,
      userEmail: storeState.user?.email,
      userOnboarded: storeState.user?.isOnboarded,
      isLoading: storeState.isLoading,
      hasError: !!storeState.error,
    });

    // Test 5: Check user profile in database
    if (user) {
      console.log("\n5️⃣ Checking user profile in database...");
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("username, is_onboarded, created_at, last_login_at")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("❌ Profile error:", profileError);
      } else if (profileData) {
        console.log("✅ User profile found:", {
          username: profileData.username || "none",
          isOnboarded: profileData.is_onboarded,
          createdAt: profileData.created_at ? new Date(profileData.created_at).toLocaleString() : "unknown",
          lastLoginAt: profileData.last_login_at ? new Date(profileData.last_login_at).toLocaleString() : "never",
        });
      } else {
        console.log("⚠️  No user profile found in database");
      }
    }

    console.log("\n🎉 Authentication persistence test complete!");
  } catch (error) {
    console.error("❌ Authentication test failed:", error);
  }
};

/**
 * Clear all authentication data (for testing purposes)
 */
export const clearAuthData = async (): Promise<void> => {
  console.log("🧹 Clearing all authentication data...");

  try {
    // Sign out from Supabase
    await supabase.auth.signOut();

    // Clear AsyncStorage
    await AsyncStorage.removeItem("auth-storage");

    // Reset Zustand store
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    console.log("✅ All authentication data cleared");
  } catch (error) {
    console.error("❌ Failed to clear auth data:", error);
  }
};

/**
 * Force refresh authentication state
 */
export const refreshAuthState = async (): Promise<void> => {
  console.log("🔄 Refreshing authentication state...");

  try {
    const { checkAuthState } = useAuthStore.getState();
    await checkAuthState();
    console.log("✅ Authentication state refreshed");
  } catch (error) {
    console.error("❌ Failed to refresh auth state:", error);
  }
};
