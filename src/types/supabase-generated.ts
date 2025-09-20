export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4";
  };
  public: {
    Tables: {
      confessions: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          is_anonymous: boolean;
          likes: number;
          transcription: string | null;
          type: string;
          updated_at: string | null;
          user_id: string | null;
          video_duration: number | null;
          video_file_size: number | null;
          video_processing_status: string | null;
          video_quality: string | null;
          video_thumbnail_url: string | null;
          video_uri: string | null;
          video_url: string | null;
          views: number;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          is_anonymous?: boolean;
          likes?: number;
          transcription?: string | null;
          type: string;
          updated_at?: string | null;
          user_id?: string | null;
          video_duration?: number | null;
          video_file_size?: number | null;
          video_processing_status?: string | null;
          video_quality?: string | null;
          video_thumbnail_url?: string | null;
          video_uri?: string | null;
          video_url?: string | null;
          views?: number;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          is_anonymous?: boolean;
          likes?: number;
          transcription?: string | null;
          type?: string;
          updated_at?: string | null;
          user_id?: string | null;
          video_duration?: number | null;
          video_file_size?: number | null;
          video_processing_status?: string | null;
          video_quality?: string | null;
          video_thumbnail_url?: string | null;
          video_uri?: string | null;
          video_url?: string | null;
          views?: number;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          created_at: string | null;
          likes_enabled: boolean | null;
          push_enabled: boolean | null;
          quiet_hours_end: string | null;
          quiet_hours_start: string | null;
          replies_enabled: boolean | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          likes_enabled?: boolean | null;
          push_enabled?: boolean | null;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          replies_enabled?: boolean | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          likes_enabled?: boolean | null;
          push_enabled?: boolean | null;
          quiet_hours_end?: string | null;
          quiet_hours_start?: string | null;
          replies_enabled?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          actor_user_id: string | null;
          created_at: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          message: string;
          read_at: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          created_at?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          message: string;
          read_at?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          created_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          message?: string;
          read_at?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string | null;
          id: string;
          platform: string;
          token: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          platform: string;
          token: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          platform?: string;
          token?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      replies: {
        Row: {
          confession_id: string;
          content: string;
          created_at: string;
          id: string;
          is_anonymous: boolean;
          likes: number;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          confession_id: string;
          content: string;
          created_at?: string;
          id?: string;
          is_anonymous?: boolean;
          likes?: number;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          confession_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          is_anonymous?: boolean;
          likes?: number;
          updated_at?: string | null;
          user_id?: string | null;
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
            foreignKeyName: "replies_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: false;
            referencedRelation: "public_confessions";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          additional_details: string | null;
          confession_id: string | null;
          created_at: string | null;
          id: string;
          reason: string;
          reply_id: string | null;
          reporter_user_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string | null;
        };
        Insert: {
          additional_details?: string | null;
          confession_id?: string | null;
          created_at?: string | null;
          id?: string;
          reason: string;
          reply_id?: string | null;
          reporter_user_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string | null;
        };
        Update: {
          additional_details?: string | null;
          confession_id?: string | null;
          created_at?: string | null;
          id?: string;
          reason?: string;
          reply_id?: string | null;
          reporter_user_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string | null;
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
            foreignKeyName: "reports_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: false;
            referencedRelation: "public_confessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reply_id_fkey";
            columns: ["reply_id"];
            isOneToOne: false;
            referencedRelation: "replies";
            referencedColumns: ["id"];
          },
        ];
      };
      user_likes: {
        Row: {
          confession_id: string | null;
          created_at: string;
          id: string;
          reply_id: string | null;
          user_id: string;
        };
        Insert: {
          confession_id?: string | null;
          created_at?: string;
          id?: string;
          reply_id?: string | null;
          user_id: string;
        };
        Update: {
          confession_id?: string | null;
          created_at?: string;
          id?: string;
          reply_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_likes_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: false;
            referencedRelation: "confessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_likes_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: false;
            referencedRelation: "public_confessions";
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
      user_memberships: {
        Row: {
          auto_renew: boolean | null;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          plan_id: string | null;
          subscription_id: string | null;
          tier: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          auto_renew?: boolean | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          plan_id?: string | null;
          subscription_id?: string | null;
          tier?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          auto_renew?: boolean | null;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          plan_id?: string | null;
          subscription_id?: string | null;
          tier?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          autoplay: boolean | null;
          captions_default: boolean | null;
          created_at: string;
          data_usage_mode: string | null;
          haptics_enabled: boolean | null;
          quality_preference: string | null;
          reduced_motion: boolean | null;
          sound_enabled: boolean | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          autoplay?: boolean | null;
          captions_default?: boolean | null;
          created_at?: string;
          data_usage_mode?: string | null;
          haptics_enabled?: boolean | null;
          quality_preference?: string | null;
          reduced_motion?: boolean | null;
          sound_enabled?: boolean | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          autoplay?: boolean | null;
          captions_default?: boolean | null;
          created_at?: string;
          data_usage_mode?: string | null;
          haptics_enabled?: boolean | null;
          quality_preference?: string | null;
          reduced_motion?: boolean | null;
          sound_enabled?: boolean | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          created_at: string;
          id: string;
          is_onboarded: boolean;
          last_login_at: string | null;
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          created_at?: string;
          id: string;
          is_onboarded?: boolean;
          last_login_at?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_onboarded?: boolean;
          last_login_at?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      video_analytics: {
        Row: {
          completion_rate: number | null;
          confession_id: string;
          interactions: number | null;
          last_watched: string | null;
          updated_at: string | null;
          watch_time: number | null;
        };
        Insert: {
          completion_rate?: number | null;
          confession_id: string;
          interactions?: number | null;
          last_watched?: string | null;
          updated_at?: string | null;
          watch_time?: number | null;
        };
        Update: {
          completion_rate?: number | null;
          confession_id?: string;
          interactions?: number | null;
          last_watched?: string | null;
          updated_at?: string | null;
          watch_time?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_video_analytics_confession";
            columns: ["confession_id"];
            isOneToOne: true;
            referencedRelation: "confessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_video_analytics_confession";
            columns: ["confession_id"];
            isOneToOne: true;
            referencedRelation: "public_confessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_analytics_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: true;
            referencedRelation: "confessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_analytics_confession_id_fkey";
            columns: ["confession_id"];
            isOneToOne: true;
            referencedRelation: "public_confessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_confessions: {
        Row: {
          content: string | null;
          created_at: string | null;
          id: string | null;
          is_anonymous: boolean | null;
          likes: number | null;
          transcription: string | null;
          type: string | null;
          video_uri: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          id?: string | null;
          is_anonymous?: boolean | null;
          likes?: number | null;
          transcription?: string | null;
          type?: string | null;
          video_uri?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          id?: string | null;
          is_anonymous?: boolean | null;
          likes?: number | null;
          transcription?: string | null;
          type?: string | null;
          video_uri?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      calculate_engagement_score: {
        Args: { created_at_param: string; likes_count: number };
        Returns: number;
      };
      extract_hashtags: {
        Args: { text_content: string };
        Returns: string[];
      };
      get_confession_report_count: {
        Args: { confession_uuid: string };
        Returns: number;
      };
      get_reply_report_count: {
        Args: { reply_uuid: string };
        Returns: number;
      };
      get_trending_hashtags: {
        Args: { hours_back?: number; limit_count?: number };
        Returns: {
          count: number;
          hashtag: string;
          percentage: number;
        }[];
      };
      get_trending_secrets: {
        Args: { hours_back?: number; limit_count?: number };
        Returns: {
          content: string;
          created_at: string;
          engagement_score: number;
          id: string;
          is_anonymous: boolean;
          likes: number;
          transcription: string;
          type: string;
          user_id: string;
          video_uri: string;
          video_url: string;
          views: number;
        }[];
      };
      get_unread_notification_count: {
        Args: { target_user_id: string };
        Returns: number;
      };
      get_user_tier: {
        Args: { target_user_id: string };
        Returns: string;
      };
      gtrgm_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_options: {
        Args: { "": unknown };
        Returns: undefined;
      };
      gtrgm_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      has_active_membership: {
        Args: { required_tier?: string; target_user_id: string };
        Returns: boolean;
      };
      increment_video_views: {
        Args: { confession_uuid: string };
        Returns: boolean;
      };
      search_confessions_by_hashtag: {
        Args: { limit_count?: number; search_hashtag: string };
        Returns: {
          content: string;
          created_at: string;
          id: string;
          is_anonymous: boolean;
          likes: number;
          transcription: string;
          type: string;
          user_id: string;
          video_uri: string;
          video_url: string;
          views: number;
        }[];
      };
      set_limit: {
        Args: { "": number };
        Returns: number;
      };
      show_limit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      show_trgm: {
        Args: { "": string };
        Returns: string[];
      };
      toggle_confession_like: {
        Args: { confession_uuid: string };
        Returns: {
          likes_count: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
