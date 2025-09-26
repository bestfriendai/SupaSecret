export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          is_onboarded: boolean;
          created_at: string;
          last_login_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          is_onboarded?: boolean;
          created_at?: string;
          last_login_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          is_onboarded?: boolean;
          created_at?: string;
          last_login_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      confessions: {
        Row: {
          id: string;
          user_id: string | null;
          type: "text" | "video";
          content: string;
          video_uri: string | null;
          transcription: string | null;
          is_anonymous: boolean;
          likes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type: "text" | "video";
          content: string;
          video_uri?: string | null;
          transcription?: string | null;
          is_anonymous?: boolean;
          likes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          type?: "text" | "video";
          content?: string;
          video_uri?: string | null;
          transcription?: string | null;
          is_anonymous?: boolean;
          likes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "confessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          user_id: string;
          autoplay: boolean;
          sound_enabled: boolean;
          quality_preference: string;
          data_usage_mode: string;
          captions_default: boolean;
          haptics_enabled: boolean;
          reduced_motion: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          autoplay?: boolean;
          sound_enabled?: boolean;
          quality_preference?: string;
          data_usage_mode?: string;
          captions_default?: boolean;
          haptics_enabled?: boolean;
          reduced_motion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          autoplay?: boolean;
          sound_enabled?: boolean;
          quality_preference?: string;
          data_usage_mode?: string;
          captions_default?: boolean;
          haptics_enabled?: boolean;
          reduced_motion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      video_analytics: {
        Row: {
          confession_id: string;
          watch_time: number;
          completion_rate: number;
          last_watched: string;
          interactions: number;
        };
        Insert: {
          confession_id: string;
          watch_time?: number;
          completion_rate?: number;
          last_watched?: string;
          interactions?: number;
        };
        Update: {
          confession_id?: string;
          watch_time?: number;
          completion_rate?: number;
          last_watched?: string;
          interactions?: number;
        };
        Relationships: [
          {
            foreignKeyName: "video_analytics_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: true;
            referencedRelation: "confessions";
            referencedColumns: ["id"];
          },
        ];
      };
      replies: {
        Row: {
          id: string;
          confession_id: string;
          user_id: string | null;
          content: string;
          is_anonymous: boolean;
          likes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          confession_id: string;
          user_id?: string | null;
          content: string;
          is_anonymous?: boolean;
          likes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          confession_id?: string;
          user_id?: string | null;
          content?: string;
          is_anonymous?: boolean;
          likes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "replies_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: false;
            referencedRelation: "confessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "replies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_likes: {
        Row: {
          id: string;
          user_id: string;
          confession_id: string | null;
          reply_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          confession_id?: string | null;
          reply_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          confession_id?: string | null;
          reply_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_likes_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: false;
            referencedRelation: "confessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_likes_reply_id_fkey";
            columns: ["reply_id"];
            isOneToOne: false;
            referencedRelation: "replies";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: "ios" | "android" | "web";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          confession_id: string | null;
          reply_id: string | null;
          reporter_user_id: string;
          reason:
            | "inappropriate_content"
            | "spam"
            | "harassment"
            | "false_information"
            | "violence"
            | "hate_speech"
            | "other";
          additional_details: string | null;
          status: "pending" | "reviewed" | "resolved" | "dismissed";
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          confession_id?: string | null;
          reply_id?: string | null;
          reporter_user_id: string;
          reason:
            | "inappropriate_content"
            | "spam"
            | "harassment"
            | "false_information"
            | "violence"
            | "hate_speech"
            | "other";
          additional_details?: string | null;
          status?: "pending" | "reviewed" | "resolved" | "dismissed";
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          confession_id?: string | null;
          reply_id?: string | null;
          reporter_user_id?: string;
          reason?:
            | "inappropriate_content"
            | "spam"
            | "harassment"
            | "false_information"
            | "violence"
            | "hate_speech"
            | "other";
          additional_details?: string | null;
          status?: "pending" | "reviewed" | "resolved" | "dismissed";
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reports_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: false;
            referencedRelation: "confessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reply_id_fkey";
            columns: ["reply_id"];
            isOneToOne: false;
            referencedRelation: "replies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_user_id_fkey";
            columns: ["reporter_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "like" | "reply";
          entity_id: string;
          entity_type: "confession" | "reply";
          actor_user_id: string | null;
          message: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "like" | "reply";
          entity_id: string;
          entity_type: "confession" | "reply";
          actor_user_id?: string | null;
          message: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "like" | "reply";
          entity_id?: string;
          entity_type?: "confession" | "reply";
          actor_user_id?: string | null;
          message?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          likes_enabled: boolean;
          replies_enabled: boolean;
          push_enabled: boolean;
          quiet_hours_start: string;
          quiet_hours_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          likes_enabled?: boolean;
          replies_enabled?: boolean;
          push_enabled?: boolean;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          likes_enabled?: boolean;
          replies_enabled?: boolean;
          push_enabled?: boolean;
          quiet_hours_start?: string;
          quiet_hours_end?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_memberships: {
        Row: {
          id: string;
          user_id: string;
          tier: "free" | "plus";
          plan_id: string | null;
          subscription_id: string | null;
          expires_at: string | null;
          auto_renew: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier?: "free" | "plus";
          plan_id?: string | null;
          subscription_id?: string | null;
          expires_at?: string | null;
          auto_renew?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tier?: "free" | "plus";
          plan_id?: string | null;
          subscription_id?: string | null;
          expires_at?: string | null;
          auto_renew?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          is_premium: boolean;
          subscription_ids: string[];
          customer_info: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          is_premium?: boolean;
          subscription_ids?: string[];
          customer_info?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          is_premium?: boolean;
          subscription_ids?: string[];
          customer_info?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [__ in never]: never;
    };
    Functions: {
      exec_sql: {
        Args: { sql: string };
        Returns: unknown;
      };
      get_unread_notification_count: {
        Args: { target_user_id: string };
        Returns: number;
      };
      has_active_membership: {
        Args: { target_user_id: string; required_tier?: "plus" | "free" };
        Returns: boolean;
      };
      get_user_tier: {
        Args: { target_user_id: string };
        Returns: "free" | "plus";
      };
      toggle_confession_like: {
        Args: { confession_uuid: string };
        Returns: { likes_count: number }[];
      };
      toggle_reply_like: {
        Args: { reply_uuid: string };
        Returns: { likes_count: number }[];
      };
      get_trending_hashtags: {
        Args: { hours_back: number; limit_count: number };
        Returns: { hashtag: string; count: number | string; percentage: number | string }[];
      };
      get_trending_secrets: {
        Args: { hours_back: number; limit_count: number };
        Returns: {
          id: string;
          type: "text" | "video";
          content: string;
          video_uri: string | null;
          transcription: string | null;
          created_at: string;
          is_anonymous: boolean;
          likes: number;
          engagement_score: number | string;
        }[];
      };
      search_confessions_by_hashtag: {
        Args: { search_hashtag: string };
        Returns: {
          id: string;
          type: "text" | "video";
          content: string;
          video_uri: string | null;
          transcription: string | null;
          created_at: string;
          is_anonymous: boolean;
          likes: number;
        }[];
      };
    };
    Enums: {
      [__ in never]: never;
    };
    CompositeTypes: {
      [___ in never]: never;
    };
  };
}
