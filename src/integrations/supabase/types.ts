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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string
          id: string
          nome: string
          papel: string
          renda_mensal: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          papel?: string
          renda_mensal?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          papel?: string
          renda_mensal?: number
          user_id?: string
        }
        Relationships: []
      }
      fixed_expense_occurrences: {
        Row: {
          created_at: string
          data_pagamento: string | null
          fixed_expense_id: string
          id: string
          mes: string
          status: Database["public"]["Enums"]["occurrence_status"]
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          fixed_expense_id: string
          id?: string
          mes: string
          status?: Database["public"]["Enums"]["occurrence_status"]
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          fixed_expense_id?: string
          id?: string
          mes?: string
          status?: Database["public"]["Enums"]["occurrence_status"]
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expense_occurrences_fixed_expense_id_fkey"
            columns: ["fixed_expense_id"]
            isOneToOne: false
            referencedRelation: "fixed_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          dia_vencimento: number
          id: string
          nome: string
          status: string
          user_id: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          dia_vencimento?: number
          id?: string
          nome: string
          status?: string
          user_id: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          dia_vencimento?: number
          id?: string
          nome?: string
          status?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          id: string
          nome: string
          user_id: string
          valor_alvo: number
          valor_guardado: number
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          user_id: string
          valor_alvo?: number
          valor_guardado?: number
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
          valor_alvo?: number
          valor_guardado?: number
        }
        Relationships: []
      }
      monthly_budget: {
        Row: {
          created_at: string
          id: string
          mes: string
          user_id: string
          valor_limite: number
        }
        Insert: {
          created_at?: string
          id?: string
          mes: string
          user_id: string
          valor_limite?: number
        }
        Update: {
          created_at?: string
          id?: string
          mes?: string
          user_id?: string
          valor_limite?: number
        }
        Relationships: []
      }
      receipt_items: {
        Row: {
          categoria: Database["public"]["Enums"]["product_category"]
          id: string
          nome_normalizado: string
          nome_produto: string
          preco_total: number
          preco_unitario: number
          quantidade: number
          receipt_id: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["product_category"]
          id?: string
          nome_normalizado: string
          nome_produto: string
          preco_total?: number
          preco_unitario?: number
          quantidade?: number
          receipt_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["product_category"]
          id?: string
          nome_normalizado?: string
          nome_produto?: string
          preco_total?: number
          preco_unitario?: number
          quantidade?: number
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string
          data_compra: string
          id: string
          imagem_url: string | null
          store_id: string
          user_id: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          data_compra?: string
          id?: string
          imagem_url?: string | null
          store_id: string
          user_id: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          data_compra?: string
          id?: string
          imagem_url?: string | null
          store_id?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          expires_at: string | null
          id: string
          is_trial: boolean
          plan_type: Database["public"]["Enums"]["plan_type"]
          started_at: string
          status: Database["public"]["Enums"]["plan_status"]
          trial_expires_at: string | null
          trial_started_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_trial?: boolean
          plan_type?: Database["public"]["Enums"]["plan_type"]
          started_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          trial_expires_at?: string | null
          trial_started_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          expires_at?: string | null
          id?: string
          is_trial?: boolean
          plan_type?: Database["public"]["Enums"]["plan_type"]
          started_at?: string
          status?: Database["public"]["Enums"]["plan_status"]
          trial_expires_at?: string | null
          trial_started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          onboarding_completed: boolean
          onboarding_goal: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          onboarding_goal?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          onboarding_completed?: boolean
          onboarding_goal?: string | null
          updated_at?: string
          user_id?: string
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
      billing_cycle: "monthly" | "yearly"
      occurrence_status: "pending" | "paid"
      plan_status: "active" | "cancelled" | "expired"
      plan_type: "free" | "premium"
      product_category:
        | "mercado"
        | "higiene"
        | "limpeza"
        | "bebidas"
        | "padaria"
        | "hortifruti"
        | "outros"
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
      billing_cycle: ["monthly", "yearly"],
      occurrence_status: ["pending", "paid"],
      plan_status: ["active", "cancelled", "expired"],
      plan_type: ["free", "premium"],
      product_category: [
        "mercado",
        "higiene",
        "limpeza",
        "bebidas",
        "padaria",
        "hortifruti",
        "outros",
      ],
    },
  },
} as const
