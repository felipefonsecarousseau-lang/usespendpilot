import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAdvancedInsights, type AdvancedInsight } from "@/lib/advanced-insights-engine";
import { useFixedExpenseOccurrences } from "@/hooks/useFixedExpenseOccurrences";

export function useAdvancedInsights() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const { occurrences: fixedOccurrences } = useFixedExpenseOccurrences(currentMonthStart);

  const { data, isLoading } = useQuery({
    queryKey: ["advanced-insights-data"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const [receiptsRes, itemsRes, storesRes, manualRes, familyRes, budgetRes] = await Promise.all([
        supabase.from("receipts").select("id, data_compra, valor_total, store_id").eq("user_id", user.id).order("data_compra", { ascending: false }),
        supabase.from("receipt_items").select("receipt_id, nome_normalizado, preco_unitario, preco_total, quantidade, categoria"),
        supabase.from("stores").select("id, nome").eq("user_id", user.id),
        supabase.from("manual_expenses").select("valor, data, categoria").eq("user_id", user.id),
        supabase.from("family_members").select("renda_mensal").eq("user_id", user.id),
        supabase.from("monthly_budget").select("valor_limite, mes").eq("user_id", user.id).eq("mes", currentMonthStart).maybeSingle(),
      ]);

      return {
        receipts: receiptsRes.data ?? [],
        items: itemsRes.data ?? [],
        stores: storesRes.data ?? [],
        manualExpenses: manualRes.data ?? [],
        rendaMensal: (familyRes.data ?? []).reduce((s, m) => s + Number(m.renda_mensal), 0),
        metaMensal: budgetRes.data?.valor_limite ?? null,
      };
    },
  });

  const insights: AdvancedInsight[] = useMemo(() => {
    if (!data) return [];
    return getAdvancedInsights({
      receipts: data.receipts,
      receiptItems: data.items,
      stores: data.stores,
      manualExpenses: data.manualExpenses,
      fixedOccurrences: fixedOccurrences.map((o) => ({ valor: Number(o.valor), status: o.status })),
      rendaMensal: data.rendaMensal,
      metaMensal: data.metaMensal,
      currentMonthStart,
    });
  }, [data, fixedOccurrences, currentMonthStart]);

  return { insights, isLoading };
}
