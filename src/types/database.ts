// Re-export the generated types from Supabase
export type { Database } from "./supabase-generated";

// Import the generated Database type for use
import type { Database as GeneratedDatabase } from "./supabase-generated";

// Create type aliases for easier use throughout the app
export type Tables = GeneratedDatabase["public"]["Tables"];
export type Views = GeneratedDatabase["public"]["Views"];
export type Functions = GeneratedDatabase["public"]["Functions"];

// Table row types
export type Confession = Tables["confessions"]["Row"];
export type Reply = Tables["replies"]["Row"];
export type UserProfile = Tables["user_profiles"]["Row"];
export type UserPreferencesDB = Tables["user_preferences"]["Row"];
export type UserLike = Tables["user_likes"]["Row"];
export type Notification = Tables["notifications"]["Row"];
export type NotificationPreferencesDB = Tables["notification_preferences"]["Row"];
export type Report = Tables["reports"]["Row"];
export type PushToken = Tables["push_tokens"]["Row"];
export type UserMembership = Tables["user_memberships"]["Row"];
export type VideoAnalytics = Tables["video_analytics"]["Row"];

// Insert types
export type ConfessionInsert = Tables["confessions"]["Insert"];
export type ReplyInsert = Tables["replies"]["Insert"];
export type UserProfileInsert = Tables["user_profiles"]["Insert"];
export type UserPreferencesInsert = Tables["user_preferences"]["Insert"];
export type UserLikeInsert = Tables["user_likes"]["Insert"];
export type NotificationInsert = Tables["notifications"]["Insert"];
export type NotificationPreferencesInsert = Tables["notification_preferences"]["Insert"];
export type ReportInsert = Tables["reports"]["Insert"];
export type PushTokenInsert = Tables["push_tokens"]["Insert"];
export type UserMembershipInsert = Tables["user_memberships"]["Insert"];
export type VideoAnalyticsInsert = Tables["video_analytics"]["Insert"];

// Update types
export type ConfessionUpdate = Tables["confessions"]["Update"];
export type ReplyUpdate = Tables["replies"]["Update"];
export type UserProfileUpdate = Tables["user_profiles"]["Update"];
export type UserPreferencesUpdate = Tables["user_preferences"]["Update"];
export type UserLikeUpdate = Tables["user_likes"]["Update"];
export type NotificationUpdate = Tables["notifications"]["Update"];
export type NotificationPreferencesUpdate = Tables["notification_preferences"]["Update"];
export type ReportUpdate = Tables["reports"]["Update"];
export type PushTokenUpdate = Tables["push_tokens"]["Update"];
export type UserMembershipUpdate = Tables["user_memberships"]["Update"];
export type VideoAnalyticsUpdate = Tables["video_analytics"]["Update"];

// View types (if any views exist)
export type PublicConfessionsView = Views extends { public_confessions: any }
  ? Views["public_confessions"]["Row"]
  : Confession;

// Helper type for Supabase client
export type SupabaseClient = import("@supabase/supabase-js").SupabaseClient<GeneratedDatabase>;
