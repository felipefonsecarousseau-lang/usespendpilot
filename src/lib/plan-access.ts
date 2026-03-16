import { supabase } from "@/integrations/supabase/client";

export async function isPremiumUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_plans")
    .select("plan_type, status, expires_at")
    .eq("user_id", userId)
    .eq("plan_type", "premium")
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return false;

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return false;
  }

  return true;
}

export const PREMIUM_FEATURES = [
  "Consultor financeiro automático",
  "Previsões financeiras",
  "Score de saúde financeira",
  "Comparação de preços entre supermercados",
  "Lista inteligente de compras",
  "Inflação pessoal",
  "Insights avançados de economia",
] as const;

export const PREMIUM_ROUTES = [
  "/economia-supermercado",
  "/lista-inteligente",
] as const;
