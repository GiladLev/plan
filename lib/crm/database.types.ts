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
      activities: {
        Row: {
          body: string | null
          business_id: string
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          meta: Json
        }
        Insert: {
          body?: string | null
          business_id: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          meta?: Json
        }
        Update: {
          body?: string | null
          business_id?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          meta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          email: string | null
          ics_token: string
          id: string
          kind: string
          name: string
          phone: string | null
          tax_id: string | null
          vat_rate: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          ics_token?: string
          id?: string
          kind?: string
          name: string
          phone?: string | null
          tax_id?: string | null
          vat_rate?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          ics_token?: string
          id?: string
          kind?: string
          name?: string
          phone?: string | null
          tax_id?: string | null
          vat_rate?: number
        }
        Relationships: []
      }
      checkins: {
        Row: {
          business_id: string
          created_at: string
          guest_id: string
          happened_at: string
          kiosk: string | null
          op_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          guest_id: string
          happened_at: string
          kiosk?: string | null
          op_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          guest_id?: string
          happened_at?: string
          kiosk?: string | null
          op_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          event_date: string | null
          event_type: string
          guests: number | null
          id: string
          name: string
          notes: string | null
          partner_name: string | null
          phone: string | null
          source: string | null
          stage: string
          stage_position: number
          updated_at: string
          value: number | null
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          event_date?: string | null
          event_type?: string
          guests?: number | null
          id?: string
          name: string
          notes?: string | null
          partner_name?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          stage_position?: number
          updated_at?: string
          value?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          event_date?: string | null
          event_type?: string
          guests?: number | null
          id?: string
          name?: string
          notes?: string | null
          partner_name?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          stage_position?: number
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      dishes: {
        Row: {
          business_id: string
          course: string
          id: string
          menu_id: string
          name: string
          notes: string | null
          position: number
          tags: string[]
        }
        Insert: {
          business_id: string
          course?: string
          id?: string
          menu_id: string
          name: string
          notes?: string | null
          position?: number
          tags?: string[]
        }
        Update: {
          business_id?: string
          course?: string
          id?: string
          menu_id?: string
          name?: string
          notes?: string | null
          position?: number
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "dishes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          business_id: string
          kind: string
          last_number: number
        }
        Insert: {
          business_id: string
          kind: string
          last_number?: number
        }
        Update: {
          business_id?: string
          kind?: string
          last_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_counters_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      document_lines: {
        Row: {
          business_id: string
          description: string
          document_id: string
          id: string
          position: number
          qty: number
          unit_price: number
        }
        Insert: {
          business_id: string
          description?: string
          document_id: string
          id?: string
          position?: number
          qty?: number
          unit_price?: number
        }
        Update: {
          business_id?: string
          description?: string
          document_id?: string
          id?: string
          position?: number
          qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          business_id: string
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          idempotency_key: string | null
          issue_date: string
          issued_at: string | null
          kind: string
          notes: string | null
          number: number | null
          sent_at: string | null
          status: string
          subtotal: number
          total: number
          vat: number
          vat_rate: number
        }
        Insert: {
          business_id: string
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          idempotency_key?: string | null
          issue_date?: string
          issued_at?: string | null
          kind: string
          notes?: string | null
          number?: number | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          vat?: number
          vat_rate?: number
        }
        Update: {
          business_id?: string
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          idempotency_key?: string | null
          issue_date?: string
          issued_at?: string | null
          kind?: string
          notes?: string | null
          number?: number | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          vat?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          business_id: string
          client_id: string | null
          created_at: string
          event_date: string
          guests_expected: number | null
          hall: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          business_id: string
          client_id?: string | null
          created_at?: string
          event_date: string
          guests_expected?: number | null
          hall?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          business_id?: string
          client_id?: string | null
          created_at?: string
          event_date?: string
          guests_expected?: number | null
          hall?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          business_id: string
          checked_in_at: string | null
          created_at: string
          event_id: string
          group_name: string | null
          id: string
          meal: string | null
          name: string
          party_size: number
          phone: string | null
          table_id: string | null
        }
        Insert: {
          business_id: string
          checked_in_at?: string | null
          created_at?: string
          event_id: string
          group_name?: string | null
          id?: string
          meal?: string | null
          name: string
          party_size?: number
          phone?: string | null
          table_id?: string | null
        }
        Update: {
          business_id?: string
          checked_in_at?: string | null
          created_at?: string
          event_id?: string
          group_name?: string | null
          id?: string
          meal?: string | null
          name?: string
          party_size?: number
          phone?: string | null
          table_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "seating_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          business_id: string
          client_id: string | null
          created_at: string
          ends_at: string
          id: string
          kind: string
          location: string | null
          notes: string | null
          starts_at: string
          title: string
        }
        Insert: {
          business_id: string
          client_id?: string | null
          created_at?: string
          ends_at: string
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          starts_at: string
          title: string
        }
        Update: {
          business_id?: string
          client_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          kind?: string
          location?: string | null
          notes?: string | null
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          business_id: string
          created_at: string
          display_name: string | null
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          display_name?: string | null
          role?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          display_name?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          business_id: string
          created_at: string
          event_id: string | null
          id: string
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          event_id?: string | null
          id?: string
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          event_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      seating_tables: {
        Row: {
          business_id: string
          capacity: number
          event_id: string
          id: string
          label: string
          shape: string
          x: number
          y: number
        }
        Insert: {
          business_id: string
          capacity: number
          event_id: string
          id?: string
          label: string
          shape?: string
          x?: number
          y?: number
        }
        Update: {
          business_id?: string
          capacity?: number
          event_id?: string
          id?: string
          label?: string
          shape?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "seating_tables_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seating_tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          business_id: string
          category: string
          client_id: string | null
          created_at: string
          done: boolean
          done_at: string | null
          due_at: string | null
          event_id: string | null
          id: string
          priority: number
          title: string
        }
        Insert: {
          business_id: string
          category?: string
          client_id?: string | null
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_at?: string | null
          event_id?: string | null
          id?: string
          priority?: number
          title: string
        }
        Update: {
          business_id?: string
          category?: string
          client_id?: string | null
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_at?: string | null
          event_id?: string | null
          id?: string
          priority?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_guest: {
        Args: { p_guest: string; p_table: string }
        Returns: {
          business_id: string
          checked_in_at: string | null
          created_at: string
          event_id: string
          group_name: string | null
          id: string
          meal: string | null
          name: string
          party_size: number
          phone: string | null
          table_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "guests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_in: {
        Args: { p_at: string; p_guest: string; p_kiosk?: string; p_op: string }
        Returns: {
          business_id: string
          checked_in_at: string | null
          created_at: string
          event_id: string
          group_name: string | null
          id: string
          meal: string | null
          name: string
          party_size: number
          phone: string | null
          table_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "guests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_business: {
        Args: {
          p_display_name?: string
          p_kind?: string
          p_name: string
          p_with_demo?: boolean
        }
        Returns: string
      }
      ics_feed: {
        Args: { p_token: string }
        Returns: {
          business_name: string
          ends_at: string
          id: string
          location: string
          notes: string
          starts_at: string
          title: string
        }[]
      }
      issue_document: {
        Args: { p_document: string; p_key: string }
        Returns: {
          business_id: string
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          idempotency_key: string | null
          issue_date: string
          issued_at: string | null
          kind: string
          notes: string | null
          number: number | null
          sent_at: string | null
          status: string
          subtotal: number
          total: number
          vat: number
          vat_rate: number
        }
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
