import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionData {
  subscribed: boolean;
  subscription_end: string | null;
  interval: string | null;
}

interface FullPlanData {
  isPremium: boolean;
  isTrial: boolean;
  trialDaysLeft: number | null;
  planType: string;
  status: string;
  subscriptionEnd: string | null;
  trialExpiresAt: string | null;
  startedAt: string | null;
}

async function fetchPlanData(): Promise<FullPlanData> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { isPremium: false, isTrial: false, trialDaysLeft: null, planType: "free", status: "active", subscriptionEnd: null, trialExpiresAt: null, startedAt: null };

  const userId = session.user.id;

  // Check local plan (trial) first
  const { data: plan } = await supabase
    .from("user_plans")
    .select("plan_type, status, expires_at, is_trial, trial_expires_at, started_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();

  // If user is on active trial
  if (plan?.is_trial && plan.trial_expires_at) {
    const trialEnd = new Date(plan.trial_expires_at);
    if (now < trialEnd && plan.status === "active") {
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        isPremium: true,
        isTrial: true,
        trialDaysLeft: daysLeft,
        planType: "premium",
        status: "active",
        subscriptionEnd: null,
        trialExpiresAt: plan.trial_expires_at,
        startedAt: plan.started_at,
      };
    }
  }

  // Check Stripe subscription
  try {
    const { data, error } = await supabase.functions.invoke<SubscriptionData>("check-subscription");
    if (!error && data?.subscribed) {
      return {
        isPremium: true,
        isTrial: false,
        trialDaysLeft: null,
        planType: "premium",
        status: "active",
        subscriptionEnd: data.subscription_end,
        trialExpiresAt: plan?.trial_expires_at ?? null,
        startedAt: plan?.started_at ?? null,
      };
    }
  } catch { /* ignore stripe errors */ }

  return {
    isPremium: false,
    isTrial: false,
    trialDaysLeft: null,
    planType: plan?.plan_type ?? "free",
    status: plan?.status ?? "active",
    subscriptionEnd: null,
    trialExpiresAt: plan?.trial_expires_at ?? null,
    startedAt: plan?.started_at ?? null,
  };
}

export function usePremiumStatus() {
  return useQuery({
    queryKey: ["premium-status"],
    queryFn: async (): Promise<boolean> => {
      const data = await fetchPlanData();
      return data.isPremium;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useFullPlanStatus() {
  return useQuery({
    queryKey: ["full-plan-status"],
    queryFn: fetchPlanData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

export function useSubscriptionDetails() {
  return useQuery({
    queryKey: ["subscription-details"],
    queryFn: async (): Promise<SubscriptionData> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { subscribed: false, subscription_end: null, interval: null };

      const { data, error } = await supabase.functions.invoke<SubscriptionData>("check-subscription");
      if (error || !data) return { subscribed: false, subscription_end: null, interval: null };
      return data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
