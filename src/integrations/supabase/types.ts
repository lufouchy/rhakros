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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adjustment_requests: {
        Row: {
          absence_dates: string[] | null
          absence_reason: string | null
          absence_type: Database["public"]["Enums"]["absence_type"] | null
          created_at: string
          end_time: string | null
          id: string
          reason: string
          record_type: Database["public"]["Enums"]["time_record_type"]
          request_type: string
          requested_time: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["adjustment_status"]
          user_id: string
        }
        Insert: {
          absence_dates?: string[] | null
          absence_reason?: string | null
          absence_type?: Database["public"]["Enums"]["absence_type"] | null
          created_at?: string
          end_time?: string | null
          id?: string
          reason: string
          record_type: Database["public"]["Enums"]["time_record_type"]
          request_type: string
          requested_time: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["adjustment_status"]
          user_id: string
        }
        Update: {
          absence_dates?: string[] | null
          absence_reason?: string | null
          absence_type?: Database["public"]["Enums"]["absence_type"] | null
          created_at?: string
          end_time?: string | null
          id?: string
          reason?: string
          record_type?: Database["public"]["Enums"]["time_record_type"]
          request_type?: string
          requested_time?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["adjustment_status"]
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          document_type: string
          expires_at: string | null
          file_url: string | null
          id: string
          reference_month: string
          signature_data: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          reference_month: string
          signature_data?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          reference_month?: string
          signature_data?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hours_balance: {
        Row: {
          balance_minutes: number
          id: string
          last_calculated_at: string
          user_id: string
        }
        Insert: {
          balance_minutes?: number
          id?: string
          last_calculated_at?: string
          user_id: string
        }
        Update: {
          balance_minutes?: number
          id?: string
          last_calculated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      location_settings: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          allowed_radius_meters: number | null
          company_latitude: number | null
          company_longitude: number | null
          created_at: string
          id: string
          location_mode: string
          updated_at: string
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          allowed_radius_meters?: number | null
          company_latitude?: number | null
          company_longitude?: number | null
          created_at?: string
          id?: string
          location_mode?: string
          updated_at?: string
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          allowed_radius_meters?: number | null
          company_latitude?: number | null
          company_longitude?: number | null
          created_at?: string
          id?: string
          location_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          hire_date: string | null
          id: string
          phone: string | null
          position: string | null
          sector: string | null
          specification: string | null
          status: string | null
          termination_date: string | null
          updated_at: string
          user_id: string
          work_schedule_id: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          sector?: string | null
          specification?: string | null
          status?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id: string
          work_schedule_id?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          sector?: string | null
          specification?: string | null
          status?: string | null
          termination_date?: string | null
          updated_at?: string
          user_id?: string
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_specification: string | null
          new_status: string | null
          previous_specification: string | null
          previous_status: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_specification?: string | null
          new_status?: string | null
          previous_specification?: string | null
          previous_status?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_specification?: string | null
          new_status?: string | null
          previous_specification?: string | null
          previous_status?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      time_records: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          record_type: Database["public"]["Enums"]["time_record_type"]
          recorded_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          record_type: Database["public"]["Enums"]["time_record_type"]
          recorded_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          record_type?: Database["public"]["Enums"]["time_record_type"]
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacation_requests: {
        Row: {
          created_at: string
          created_by: string
          days_count: number
          end_date: string
          id: string
          is_admin_created: boolean
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["adjustment_status"]
          updated_at: string
          user_id: string
          vacation_type: Database["public"]["Enums"]["vacation_type"]
        }
        Insert: {
          created_at?: string
          created_by: string
          days_count: number
          end_date: string
          id?: string
          is_admin_created?: boolean
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["adjustment_status"]
          updated_at?: string
          user_id: string
          vacation_type?: Database["public"]["Enums"]["vacation_type"]
        }
        Update: {
          created_at?: string
          created_by?: string
          days_count?: number
          end_date?: string
          id?: string
          is_admin_created?: boolean
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["adjustment_status"]
          updated_at?: string
          user_id?: string
          vacation_type?: Database["public"]["Enums"]["vacation_type"]
        }
        Relationships: []
      }
      work_schedules: {
        Row: {
          break_duration_minutes: number | null
          break_end_time: string | null
          break_start_time: string | null
          created_at: string
          end_time: string
          friday_hours: number | null
          id: string
          monday_hours: number | null
          name: string
          saturday_hours: number | null
          schedule_type: string
          shift_rest_hours: number | null
          shift_work_hours: number | null
          start_time: string
          sunday_hours: number | null
          thursday_hours: number | null
          tuesday_hours: number | null
          wednesday_hours: number | null
        }
        Insert: {
          break_duration_minutes?: number | null
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          end_time?: string
          friday_hours?: number | null
          id?: string
          monday_hours?: number | null
          name: string
          saturday_hours?: number | null
          schedule_type?: string
          shift_rest_hours?: number | null
          shift_work_hours?: number | null
          start_time?: string
          sunday_hours?: number | null
          thursday_hours?: number | null
          tuesday_hours?: number | null
          wednesday_hours?: number | null
        }
        Update: {
          break_duration_minutes?: number | null
          break_end_time?: string | null
          break_start_time?: string | null
          created_at?: string
          end_time?: string
          friday_hours?: number | null
          id?: string
          monday_hours?: number | null
          name?: string
          saturday_hours?: number | null
          schedule_type?: string
          shift_rest_hours?: number | null
          shift_work_hours?: number | null
          start_time?: string
          sunday_hours?: number | null
          thursday_hours?: number | null
          tuesday_hours?: number | null
          wednesday_hours?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_reset_employee_status: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      absence_type:
        | "vacation"
        | "medical_consultation"
        | "medical_leave"
        | "justified_absence"
      adjustment_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "employee"
      document_status: "pending_signature" | "signed" | "expired"
      time_record_type: "entry" | "lunch_out" | "lunch_in" | "exit"
      vacation_type: "individual" | "collective"
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
    Enums: {
      absence_type: [
        "vacation",
        "medical_consultation",
        "medical_leave",
        "justified_absence",
      ],
      adjustment_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "employee"],
      document_status: ["pending_signature", "signed", "expired"],
      time_record_type: ["entry", "lunch_out", "lunch_in", "exit"],
      vacation_type: ["individual", "collective"],
    },
  },
} as const
