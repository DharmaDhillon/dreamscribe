import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Database Types (matches Supabase schema) ──

export type UserRole = "user" | "therapist" | "admin";
export type EntryType = "dream" | "daily";
export type FollowStatus = "pending" | "approved" | "declined";
export type NotificationType =
  | "follow_request"
  | "follow_approved"
  | "new_star"
  | "new_message"
  | "therapist_alert";
export type FlagSeverity = "low" | "medium" | "high";

export interface Database {
  public: {
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          avatar_archetype: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          role: UserRole;
          therapist_id: string | null;
          is_therapist_verified: boolean;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          display_name?: string;
          avatar_archetype?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          therapist_id?: string | null;
          is_therapist_verified?: boolean;
        };
        Update: {
          email?: string;
          username?: string;
          display_name?: string;
          avatar_archetype?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          therapist_id?: string | null;
          is_therapist_verified?: boolean;
        };
        Relationships: [];
      };
      therapists: {
        Row: {
          id: string;
          user_id: string;
          license_number: string;
          license_type: string;
          practice_name: string;
          state: string;
          is_approved: boolean;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          license_number: string;
          license_type: string;
          practice_name?: string;
          state?: string;
          is_approved?: boolean;
        };
        Update: {
          license_number?: string;
          license_type?: string;
          practice_name?: string;
          state?: string;
          is_approved?: boolean;
          approved_at?: string | null;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          entry_type: EntryType;
          audio_url: string | null;
          transcript: string | null;
          duration_seconds: number | null;
          is_public: boolean;
          star_count: number;
          mood_label: string | null;
          amygdala_score: number | null;
          dlpfc_score: number | null;
          dmn_score: number | null;
          stg_score: number | null;
          acc_score: number | null;
          fatigue_score: number | null;
          peak_moment_time: string | null;
          peak_moment_quote: string | null;
          calm_moment_time: string | null;
          calm_moment_quote: string | null;
          claude_insight: string | null;
          cross_analysis_id: string | null;
        };
        Insert: {
          user_id: string;
          entry_type: EntryType;
          audio_url?: string | null;
          transcript?: string | null;
          duration_seconds?: number | null;
          is_public?: boolean;
          mood_label?: string | null;
          amygdala_score?: number | null;
          dlpfc_score?: number | null;
          dmn_score?: number | null;
          stg_score?: number | null;
          acc_score?: number | null;
          fatigue_score?: number | null;
          peak_moment_time?: string | null;
          peak_moment_quote?: string | null;
          calm_moment_time?: string | null;
          calm_moment_quote?: string | null;
          claude_insight?: string | null;
          cross_analysis_id?: string | null;
        };
        Update: {
          entry_type?: EntryType;
          audio_url?: string | null;
          transcript?: string | null;
          duration_seconds?: number | null;
          is_public?: boolean;
          star_count?: number;
          mood_label?: string | null;
          amygdala_score?: number | null;
          dlpfc_score?: number | null;
          dmn_score?: number | null;
          stg_score?: number | null;
          acc_score?: number | null;
          fatigue_score?: number | null;
          peak_moment_time?: string | null;
          peak_moment_quote?: string | null;
          calm_moment_time?: string | null;
          calm_moment_quote?: string | null;
          claude_insight?: string | null;
          cross_analysis_id?: string | null;
        };
        Relationships: [];
      };
      cross_analyses: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          dream_entry_id: string;
          daily_entry_id: string;
          claude_cross_insight: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          dream_entry_id: string;
          daily_entry_id: string;
          claude_cross_insight?: string | null;
        };
        Update: {
          dream_entry_id?: string;
          daily_entry_id?: string;
          claude_cross_insight?: string | null;
        };
        Relationships: [];
      };
      stars: {
        Row: {
          id: string;
          user_id: string;
          entry_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          entry_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          entry_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          entry_id: string;
          user_id: string;
          content: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          status: FollowStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          status?: FollowStatus;
        };
        Update: {
          status?: FollowStatus;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          sender_id: string;
          receiver_id: string;
          content: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          from_user_id: string | null;
          entry_id: string | null;
          message_text: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: NotificationType;
          from_user_id?: string | null;
          entry_id?: string | null;
          message_text: string;
          is_read?: boolean;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      terms_acknowledgments: {
        Row: {
          id: string;
          user_id: string;
          terms_version: string;
          privacy_version: string;
          acknowledged_at: string;
          user_agent: string | null;
          context: string | null;
        };
        Insert: {
          user_id: string;
          terms_version: string;
          privacy_version: string;
          user_agent?: string | null;
          context?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      mnemo_flags: {
        Row: {
          id: string;
          user_id: string;
          therapist_id: string;
          flag_type: string;
          flag_message: string;
          entry_ids: string[];
          severity: FlagSeverity;
          created_at: string;
          is_resolved: boolean;
          resolved_at: string | null;
        };
        Insert: {
          user_id: string;
          therapist_id: string;
          flag_type: string;
          flag_message: string;
          entry_ids?: string[];
          severity?: FlagSeverity;
          is_resolved?: boolean;
        };
        Update: {
          is_resolved?: boolean;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
    };
  };
}
