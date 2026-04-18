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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          content: string
          generated_at: string
          id: string
          report_type: string
          scope: string
          week_date: string | null
        }
        Insert: {
          content: string
          generated_at?: string
          id?: string
          report_type: string
          scope: string
          week_date?: string | null
        }
        Update: {
          content?: string
          generated_at?: string
          id?: string
          report_type?: string
          scope?: string
          week_date?: string | null
        }
        Relationships: []
      }
      initiatives: {
        Row: {
          category: string
          created_at: string
          current_value: number | null
          description: string | null
          due_date: string | null
          effort: number | null
          id: string
          impact: number | null
          impediment: string | null
          indicator: string | null
          indicator_type: string | null
          key_result_id: string | null
          notes: string | null
          number: number
          owner: string | null
          priority_score: number | null
          status: string
          target_percentage: number | null
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          current_value?: number | null
          description?: string | null
          due_date?: string | null
          effort?: number | null
          id?: string
          impact?: number | null
          impediment?: string | null
          indicator?: string | null
          indicator_type?: string | null
          key_result_id?: string | null
          notes?: string | null
          number?: number
          owner?: string | null
          priority_score?: number | null
          status?: string
          target_percentage?: number | null
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number | null
          description?: string | null
          due_date?: string | null
          effort?: number | null
          id?: string
          impact?: number | null
          impediment?: string | null
          indicator?: string | null
          indicator_type?: string | null
          key_result_id?: string | null
          notes?: string | null
          number?: number
          owner?: string | null
          priority_score?: number | null
          status?: string
          target_percentage?: number | null
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      key_results: {
        Row: {
          baseline: number
          code: string
          created_at: string
          current_value: number
          health: string
          id: string
          metric_type: string
          objective_id: string
          owner: string | null
          target: number
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          baseline?: number
          code: string
          created_at?: string
          current_value?: number
          health?: string
          id?: string
          metric_type: string
          objective_id: string
          owner?: string | null
          target?: number
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          baseline?: number
          code?: string
          created_at?: string
          current_value?: number
          health?: string
          id?: string
          metric_type?: string
          objective_id?: string
          owner?: string | null
          target?: number
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_mrr: {
        Row: {
          created_at: string
          id: string
          month: number
          realized_value: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          realized_value?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          realized_value?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      objectives: {
        Row: {
          confidence: number
          created_at: string
          health: string
          id: string
          statement: string
          target_annual: number
          target_monthly: number
          timeframe: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          health?: string
          id?: string
          statement: string
          target_annual?: number
          target_monthly?: number
          timeframe: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          health?: string
          id?: string
          statement?: string
          target_annual?: number
          target_monthly?: number
          timeframe?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_reports: {
        Row: {
          ai_report_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          title: string
          token: string
          view_count: number | null
        }
        Insert: {
          ai_report_id: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          title: string
          token?: string
          view_count?: number | null
        }
        Update: {
          ai_report_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          title?: string
          token?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_reports_ai_report_id_fkey"
            columns: ["ai_report_id"]
            isOneToOne: false
            referencedRelation: "ai_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_checkins: {
        Row: {
          author: string
          blockers: string | null
          created_at: string
          id: string
          initiative_id: string
          next_steps: string | null
          notes: string | null
          progress_delta: string | null
          status_snapshot: string
          week_date: string
        }
        Insert: {
          author?: string
          blockers?: string | null
          created_at?: string
          id?: string
          initiative_id: string
          next_steps?: string | null
          notes?: string | null
          progress_delta?: string | null
          status_snapshot: string
          week_date: string
        }
        Update: {
          author?: string
          blockers?: string | null
          created_at?: string
          id?: string
          initiative_id?: string
          next_steps?: string | null
          notes?: string | null
          progress_delta?: string | null
          status_snapshot?: string
          week_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_checkins_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
