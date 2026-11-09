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
      garmin_sessions: {
        Row: {
          user_id: string;
          session_data: Json;
          garmin_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          session_data: Json;
          garmin_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          session_data?: Json;
          garmin_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
