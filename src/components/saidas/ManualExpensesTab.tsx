import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Trash2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import QuickAddExpenseModal from "@/components/QuickAddExpenseModal";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDashboardData } from "@/lib/invalidateFinancialData";
import { CATEGORY_LABELS } from "@/constants/categoryLabels";

interface ManualExpense {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  data: string;
}

const formatCurrency = (val: number) => (
  <span className="currency-display">
    R$ {val.toFixed(2).split(".")[0]}
    <span className="opacity-50">,{val.toFixed(2).split(".")[1]}</span>
  </span>
);

const ManualExpensesTab = () => {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManualExpense | null>(null);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["saidas-manual-all"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("manual_expenses")
        .select("id, nome, valor, categoria, data")
        .eq("user_id", user.id)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as ManualExpense[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saidas-manual-all"] });
      invalidateDashboardData(queryClient);
      toast.success("Gasto removido.");
    },
    onError: () => toast.error("Erro ao remover gasto."),
  });

  const total = expenses.reduce((s, e) => s + e.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold">Gastos Rápidos</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => setQuickAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {total > 0 && (
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Total registrado</p>
          <p className="text-2xl font-bold font-mono text-foreground">
            R$ {total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{expenses.length} gasto{expenses.length !== 1 ? "s" : ""}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm glass-card">
          Nenhum gasto rápido registrado. Toque em "Novo" para começar.
        </div>
      ) : (
        <div className="glass-card divide-y divide-border">
          {expenses.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center justify-between p-4 gap-4 group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="rounded-full bg-accent/10 p-1.5 shrink-0">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{e.nome}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      {CATEGORY_LABELS[e.categoria] ?? e.categoria}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono shrink-0">{formatCurrency(e.valor)}</span>
                <button
                  onClick={() => setDeleteTarget(e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick add modal */}
      <QuickAddExpenseModal
        open={quickAddOpen}
        onClose={() => {
          setQuickAddOpen(false);
          queryClient.invalidateQueries({ queryKey: ["saidas-manual-all"] });
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.nome}"</AlertDialogTitle>
            <AlertDialogDescription>Deseja remover este gasto? Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManualExpensesTab;
