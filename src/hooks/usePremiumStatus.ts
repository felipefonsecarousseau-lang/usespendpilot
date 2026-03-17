import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionData {
  subscribed: boolean;
  subscription_end: string | null;
  interval: string | null;
}

export function usePremiumStatus() {
  return useQuery({
    queryKey: ["premium-status"],
    queryFn: async (): Promise<boolean> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { data, error } = await supabase.functions.invoke<SubscriptionData>("check-subscription");

      if (error || !data) return false;
      return data.subscribed === true;
    },
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
