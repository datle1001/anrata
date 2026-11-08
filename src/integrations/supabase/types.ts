export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      filing_reviews: {
        Row: {
          filing_id: string
          note: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          filing_id: string
          note?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          filing_id?: string
          note?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oma_access_state: {
        Row: {
          blocked: boolean
          message: string | null
          status: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked?: boolean
          message?: string | null
          status?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          blocked?: boolean
          message?: string | null
          status?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oma_audit: {
        Row: {
          action: string
          created_at: string
          evidence: Json
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          evidence?: Json
          id?: string
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          evidence?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      oma_conversations: {
        Row: {
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_filings: {
        Row: {
          administration: string
          affected_stations: Json
          evidence: Json
          filing_id: string
          freq_lower_mhz: number
          freq_upper_mhz: number
          id: string
          issue: number
          network_name: string
          owner_scope: string
          pfd_screening: Json | null
          pfd_status: string
          publication_id: string
          raw: Json
          review_trigger: string
          updated_at: string
          user_id: string | null
          worst_margin_db: number | null
        }
        Insert: {
          administration: string
          affected_stations?: Json
          evidence?: Json
          filing_id: string
          freq_lower_mhz: number
          freq_upper_mhz: number
          id?: string
          issue: number
          network_name: string
          owner_scope: string
          pfd_screening?: Json | null
          pfd_status?: string
          publication_id: string
          raw: Json
          review_trigger: string
          updated_at?: string
          user_id?: string | null
          worst_margin_db?: number | null
        }
        Update: {
          administration?: string
          affected_stations?: Json
          evidence?: Json
          filing_id?: string
          freq_lower_mhz?: number
          freq_upper_mhz?: number
          id?: string
          issue?: number
          network_name?: string
          owner_scope?: string
          pfd_screening?: Json | null
          pfd_status?: string
          publication_id?: string
          raw?: Json
          review_trigger?: string
          updated_at?: string
          user_id?: string | null
          worst_margin_db?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_filings_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "uploaded_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_publications: {
        Row: {
          filename: string
          filing_evidence: Json
          id: string
          issue: number
          owner_scope: string
          publication: Json
          raw: string
          sha256: string
          transferred: boolean
          transferred_at: string | null
          uploaded_at: string
          user_id: string | null
        }
        Insert: {
          filename: string
          filing_evidence?: Json
          id?: string
          issue: number
          owner_scope: string
          publication: Json
          raw: string
          sha256: string
          transferred?: boolean
          transferred_at?: string | null
          uploaded_at?: string
          user_id?: string | null
        }
        Update: {
          filename?: string
          filing_evidence?: Json
          id?: string
          issue?: number
          owner_scope?: string
          publication?: Json
          raw?: string
          sha256?: string
          transferred?: boolean
          transferred_at?: string | null
          uploaded_at?: string
          user_id?: string | null
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
