import { supabase } from "@/integrations/supabase/client";

export interface PlanInfo {
  isPremium: boolean;
  isTrial: boolean;
  trialDaysLeft: number | null;
  planType: string;
  status: string;
  expiresAt: string | null;
  trialExpiresAt: string | null;
  startedAt: string | null;
}

export async function getUserPlanInfo(userId: string): Promise<PlanInfo> {
  const { data, error } = await supabase
    .from("user_plans")
    .select("plan_type, status, expires_at, is_trial, trial_expires_at, started_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { isPremium: false, isTrial: false, trialDaysLeft: null, planType: "free", status: "active", expiresAt: null, trialExpiresAt: null, startedAt: null };
  }

  const now = new Date();

  // Check trial
  if (data.is_trial && data.trial_expires_at) {
    const trialEnd = new Date(data.trial_expires_at);
    if (now < trialEnd && data.status === "active") {
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isPremium: true,
        isTrial: true,
        trialDaysLeft: daysLeft,
        planType: "premium",
        status: "active",
        expiresAt: data.expires_at,
        trialExpiresAt: data.trial_expires_at,
        startedAt: data.started_at,
      };
    }
    // Trial expired
    return {
      isPremium: false,
      isTrial: false,
      trialDaysLeft: 0,
      planType: "free",
      status: "expired",
      expiresAt: null,
      trialExpiresAt: data.trial_expires_at,
      startedAt: data.started_at,
    };
  }

  // Regular premium
  if (data.plan_type === "premium" && data.status === "active") {
    if (data.expires_at && new Date(data.expires_at) < now) {
      return { isPremium: false, isTrial: false, trialDaysLeft: null, planType: "free", status: "expired", expiresAt: data.expires_at, trialExpiresAt: null, startedAt: data.started_at };
    }
    return { isPremium: true, isTrial: false, trialDaysLeft: null, planType: "premium", status: "active", expiresAt: data.expires_at, trialExpiresAt: null, startedAt: data.started_at };
  }

  return { isPremium: false, isTrial: false, trialDaysLeft: null, planType: data.plan_type, status: data.status, expiresAt: data.expires_at, trialExpiresAt: data.trial_expires_at, startedAt: data.started_at };
}

export async function isPremiumUser(userId: string): Promise<boolean> {
  const info = await getUserPlanInfo(userId);
  return info.isPremium;
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
