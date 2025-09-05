export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          username: string | null
          is_onboarded: boolean
          created_at: string
          last_login_at: string
        }
        Insert: {
          id: string
          username?: string | null
          is_onboarded?: boolean
          created_at?: string
          last_login_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          is_onboarded?: boolean
          created_at?: string
          last_login_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      confessions: {
        Row: {
          id: string
          user_id: string | null
          type: 'text' | 'video'
          content: string
          video_uri: string | null
          transcription: string | null
          is_anonymous: boolean
          likes: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: 'text' | 'video'
          content: string
          video_uri?: string | null
          transcription?: string | null
          is_anonymous?: boolean
          likes?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: 'text' | 'video'
          content?: string
          video_uri?: string | null
          transcription?: string | null
          is_anonymous?: boolean
          likes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "confessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_preferences: {
        Row: {
          user_id: string
          autoplay: boolean
          sound_enabled: boolean
          quality_preference: string
          data_usage_mode: string
        }
        Insert: {
          user_id: string
          autoplay?: boolean
          sound_enabled?: boolean
          quality_preference?: string
          data_usage_mode?: string
        }
        Update: {
          user_id?: string
          autoplay?: boolean
          sound_enabled?: boolean
          quality_preference?: string
          data_usage_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      video_analytics: {
        Row: {
          confession_id: string
          watch_time: number
          completion_rate: number
          last_watched: string
          interactions: number
        }
        Insert: {
          confession_id: string
          watch_time?: number
          completion_rate?: number
          last_watched?: string
          interactions?: number
        }
        Update: {
          confession_id?: string
          watch_time?: number
          completion_rate?: number
          last_watched?: string
          interactions?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_analytics_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: true
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          }
        ]
      }
      replies: {
        Row: {
          id: string
          confession_id: string
          user_id: string | null
          content: string
          is_anonymous: boolean
          likes: number
          created_at: string
        }
        Insert: {
          id?: string
          confession_id: string
          user_id?: string | null
          content: string
          is_anonymous?: boolean
          likes?: number
          created_at?: string
        }
        Update: {
          id?: string
          confession_id?: string
          user_id?: string | null
          content?: string
          is_anonymous?: boolean
          likes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "replies_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_likes: {
        Row: {
          id: string
          user_id: string
          confession_id: string | null
          reply_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          confession_id?: string | null
          reply_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          confession_id?: string | null
          reply_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_likes_confession_id_fkey"
            columns: ["confession_id"]
            isOneToOne: false
            referencedRelation: "confessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "replies"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
