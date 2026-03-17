import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Occurrence {
  id: string;
  fixed_expense_id: string;
  user_id: string;
  mes: string;
  valor: number;
  status: "pending" | "paid";
  data_pagamento: string | null;
  created_at: string;
  // joined
  nome?: string;
  categoria?: string;
  dia_vencimento?: number;
}

/**
 * Ensures every active fixed_expense has an occurrence row for the given month.
 * Returns the occurrences for that month.
 */
export function useFixedExpenseOccurrences(monthStart: string) {
  const queryClient = useQueryClient();

  const { data: occurrences = [], isLoading } = useQuery({
    queryKey: ["fixed-expense-occurrences", monthStart],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // 1. Get all active fixed expenses
      const { data: expenses, error: expErr } = await supabase
        .from("fixed_expenses")
        .select("id, nome, valor, categoria, dia_vencimento")
        .eq("user_id", user.id)
        .eq("ativo", true);
      if (expErr) throw expErr;
      if (!expenses || expenses.length === 0) return [];

      // 2. Get existing occurrences for this month
      const { data: existing, error: occErr } = await supabase
        .from("fixed_expense_occurrences")
        .select("*")
        .eq("user_id", user.id)
        .eq("mes", monthStart);
      if (occErr) throw occErr;

      const existingMap = new Map((existing ?? []).map((o: any) => [o.fixed_expense_id, o]));

      // 3. Find missing occurrences and create them
      const missing = expenses.filter((e) => !existingMap.has(e.id));
      if (missing.length > 0) {
        const rows = missing.map((e) => ({
          fixed_expense_id: e.id,
          user_id: user.id,
          mes: monthStart,
          valor: e.valor,
          status: "pending" as const,
        }));
        const { data: inserted, error: insErr } = await supabase
          .from("fixed_expense_occurrences")
          .insert(rows)
          .select("*");
        if (insErr) throw insErr;
        for (const row of inserted ?? []) {
          existingMap.set(row.fixed_expense_id, row);
        }
      }

      // 4. Merge with expense metadata
      const expenseMap = new Map(expenses.map((e) => [e.id, e]));
      const result: Occurrence[] = [];
      for (const [fid, occ] of existingMap) {
        const exp = expenseMap.get(fid);
        result.push({
          ...(occ as any),
          nome: exp?.nome ?? "Conta removida",
          categoria: exp?.categoria ?? "",
          dia_vencimento: exp?.dia_vencimento ?? 0,
        });
      }

      return result.sort((a, b) => (a.dia_vencimento ?? 0) - (b.dia_vencimento ?? 0));
    },
  });

  const markPaid = useMutation({
    mutationFn: async (occurrenceId: string) => {
      const { error } = await supabase
        .from("fixed_expense_occurrences")
        .update({ status: "paid", data_pagamento: new Date().toISOString() })
        .eq("id", occurrenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expense-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-fixed-expenses"] });
    },
  });

  const markPending = useMutation({
    mutationFn: async (occurrenceId: string) => {
      const { error } = await supabase
        .from("fixed_expense_occurrences")
        .update({ status: "pending", data_pagamento: null })
        .eq("id", occurrenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expense-occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-fixed-expenses"] });
    },
  });

  const totals = occurrences.reduce(
    (acc, o) => {
      const v = Number(o.valor) || 0;
      acc.total += v;
      if (o.status === "paid") acc.paid += v;
      else acc.pending += v;
      return acc;
    },
    { total: 0, paid: 0, pending: 0 }
  );

  return { occurrences, isLoading, markPaid, markPending, totals };
}
