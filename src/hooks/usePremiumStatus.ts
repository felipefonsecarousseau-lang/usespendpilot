import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePremiumStatus() {
  return useQuery({
    queryKey: ["premium-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_plans")
        .select("plan_type, status, expires_at")
        .eq("user_id", user.id)
        .eq("plan_type", "premium")
        .eq("status", "active")
        .maybeSingle();

      if (error || !data) return false;
      if (data.expires_at && new Date(data.expires_at) < new Date()) return false;
      return true;
    },
    staleTime: 60_000,
  });
}
