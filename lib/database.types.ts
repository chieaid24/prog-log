// Schema types for supabase-js, in the `supabase gen types typescript` output
// format. Hand-maintained: the CLI's typegen cannot run in this environment
// (ADR-0006); once a live project exists, regenerate with
//   npx supabase gen types typescript --linked --schema public
// and diff. tests/db/foundation.test.ts pins the enum labels/order to the DB.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          user_id: string;
          timezone: string;
        };
        Insert: {
          user_id?: string;
          timezone?: string;
        };
        Update: {
          user_id?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          entry_date: string;
          time_spent: Database["public"]["Enums"]["time_size"];
          milestone: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          project_id: string;
          entry_date?: string;
          time_spent: Database["public"]["Enums"]["time_size"];
          milestone?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          entry_date?: string;
          time_spent?: Database["public"]["Enums"]["time_size"];
          milestone?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_aliases: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          alias: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          project_id: string;
          alias: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          alias?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_aliases_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string | null;
          status: string;
          color: string | null;
          started: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          category?: string | null;
          status?: string;
          color?: string | null;
          started?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: string | null;
          status?: string;
          color?: string | null;
          started?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      log_entry: {
        Args: {
          p_project: string;
          p_time: Database["public"]["Enums"]["time_size"];
          p_milestone?: string | null;
          p_description?: string | null;
          p_user?: string;
          p_date?: string | null;
        };
        Returns: Database["public"]["Tables"]["entries"]["Row"];
      };
    };
    Enums: {
      time_size: "small" | "medium" | "large";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
