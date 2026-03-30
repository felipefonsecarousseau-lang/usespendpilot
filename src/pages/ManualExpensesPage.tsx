import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, AlertTriangle, CalendarClock, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFixedExpenseOccurrences, type Occurrence } from "@/hooks/useFixedExpenseOccurrences";
import { invalidateDashboardData } from "@/lib/invalidateFinancialData";

interface FixedExpense {
  id: string;
  user_id: string;
  nome: string;
  categoria: string;
  valor: number;
  dia_vencimento: number;
  status: string;
  ativo: boolean;
  created_at: string;
}

const categorias = ["Moradia", "Utilidades", "Streaming", "Internet", "Telefone", "Seguro", "Educação", "Outros"];
const diasDoMes = Array.from({ length: 31 }, (_, i) => i + 1);

const getProximoVencimento = (dia: number): Date => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const venc = new Date(ano, mes, dia);
  if (venc < hoje) venc.setMonth(venc.getMonth() + 1);
  return venc;
};

const ManualExpensesPage = () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [diaRecorrente, setDiaRecorrente] = useState<number>(1);
  const [categoria, setCategoria] = useState(categorias[0]);
  const [deleteTarget, setDeleteTarget] = useState<Occurrence | null>(null);
  const queryClient = useQueryClient();

  // Fetch base fixed expenses (for adding new ones)
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["fixed-expenses"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("fixed_expenses")
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .order("dia_vencimento");
      if (error) throw error;
      return data as FixedExpense[];
    },
  });

  // Occurrences for the current month (auto-generated)
  const { occurrences, isLoading: loadingOcc, markPaid, markPending, totals } =
    useFixedExpenseOccurrences(currentMonthStart);

  const addMutation = useMutation({
    mutationFn: async (exp: { nome: string; valor: number; dia_vencimento: number; categoria: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("fixed_expenses").insert({
        user_id: user.id,
        nome: exp.nome,
        valor: exp.valor,
        dia_vencimento: exp.dia_vencimento,
        categoria: exp.categoria,
        status: "pendente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDashboardData(queryClient);
      toast.success("Conta recorrente adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar conta."),
  });

  // Deletes the fixed_expense permanently (all future months)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fixed_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDashboardData(queryClient);
      toast.success("Conta removida definitivamente.");
    },
    onError: () => toast.error("Erro ao remover conta."),
  });

  // Deletes only this month's occurrence (keeps the recurring expense)
  const deleteOccurrenceMutation = useMutation({
    mutationFn: async (occurrenceId: string) => {
      const { error } = await supabase
        .from("fixed_expense_occurrences")
        .delete()
        .eq("id", occurrenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDashboardData(queryClient);
      toast.success("Removido apenas deste mês.");
    },
    onError: () => toast.error("Erro ao remover ocorrência."),
  });

  // Alerts for upcoming due dates
  const alertas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return occurrences
      .filter((o) => {
        if (o.status === "paid") return false;
        const venc = getProximoVencimento(o.dia_vencimento ?? 1);
        const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 3;
      })
      .map((o) => {
        const venc = getProximoVencimento(o.dia_vencimento ?? 1);
        const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return { ...o, diasRestantes: diff };
      });
  }, [occurrences]);

  const pendingOccs = occurrences.filter((o) => o.status === "pending");
  const paidOccs = occurrences.filter((o) => o.status === "paid");

  const handleToggleStatus = (occ: Occurrence) => {
    if (occ.status === "pending") {
      markPaid.mutate(occ.id);
      toast.success(`${occ.nome} marcado como pago!`);
    } else {
      markPending.mutate(occ.id);
    }
  };

  const addExpense = () => {
    if (!nome || !valor) {
      toast.error("Preencha todos os campos.");
      return;
    }
    addMutation.mutate({
      nome,
      valor: parseFloat(valor),
      dia_vencimento: diaRecorrente,
      categoria,
    });
    setNome("");
    setValor("");
    setDiaRecorrente(1);
    setCategoria(categorias[0]);
    setShowForm(false);
  };

  const formatCurrency = (val: number) => {
    const [intPart, decPart] = val.toFixed(2).split(".");
    return (
      <span className="currency-display">
        R$ {intPart}<span className="opacity-50">,{decPart}</span>
      </span>
    );
  };

  const formatSimple = (val: number) =>
    `R$ ${val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const isLoading = loadingExpenses || loadingOcc;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contas Recorrentes</h1>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{monthName}</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>

        {/* Summary card */}
        {totals.total > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total contas fixas</p>
                <p className="text-xl font-bold font-mono text-foreground">{formatSimple(totals.total)}</p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">{formatSimple(totals.paid)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-accent" />
                  <span className="text-muted-foreground">{formatSimple(totals.pending)}</span>
                </div>
              </div>
            </div>
            {/* Progress */}
            <div className="w-full h-1.5 rounded-full bg-muted mt-3">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${totals.total > 0 ? (totals.paid / totals.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Alerts */}
        {alertas.length > 0 && (
          <div className="space-y-2">
            {alertas.map((a) => (
              <Alert key={a.id} variant="destructive" className="border-destructive/30 bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>{a.nome}</strong> vence{" "}
                  {a.diasRestantes === 0 ? "hoje" : `em ${a.diasRestantes} dia${a.diasRestantes > 1 ? "s" : ""}`} —{" "}
                  {formatCurrency(a.valor)}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="glass-card p-4 space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Nome da conta" value={nome} onChange={(e) => setNome(e.target.value)} className="bg-secondary" />
              <Input placeholder="Valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="bg-secondary" />
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={diaRecorrente}
                  onChange={(e) => setDiaRecorrente(Number(e.target.value))}
                  className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-full"
                >
                  {diasDoMes.map((d) => (
                    <option key={d} value={d}>Todo dia {d}</option>
                  ))}
                </select>
              </div>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="bg-secondary border border-border rounded-md px-3 py-2 text-sm">
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={addExpense} disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Adicionar
              </Button>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : occurrences.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Adicione contas fixas para prever seus gastos mensais.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending */}
            {pendingOccs.length > 0 && (
              <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Pendentes ({pendingOccs.length})
                </h2>
                <div className="glass-card divide-y divide-border">
                  {pendingOccs.map((occ, i) => (
                    <motion.div
                      key={occ.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between p-4 gap-4 group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleStatus(occ)}
                          className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/20 text-accent hover:bg-primary/20 hover:text-primary transition-colors"
                          title="Marcar como pago"
                        >
                          Pendente
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{occ.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {occ.categoria} · Dia {occ.dia_vencimento}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">{formatCurrency(Number(occ.valor))}</span>
                        <button
                          onClick={() => setDeleteTarget(occ)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid */}
            {paidOccs.length > 0 && (
              <div>
                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Pagas ({paidOccs.length})
                </h2>
                <div className="glass-card divide-y divide-border">
                  {paidOccs.map((occ, i) => (
                    <motion.div
                      key={occ.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between p-4 gap-4 group opacity-60"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggleStatus(occ)}
                          className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/20 text-primary hover:bg-accent/20 hover:text-accent transition-colors"
                          title="Desfazer pagamento"
                        >
                          Pago
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate line-through">{occ.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {occ.categoria} · Dia {occ.dia_vencimento}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">{formatCurrency(Number(occ.valor))}</span>
                        <button
                          onClick={() => setDeleteTarget(occ)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.nome}"</AlertDialogTitle>
            <AlertDialogDescription>
              Como você deseja excluir esta conta recorrente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (deleteTarget) deleteOccurrenceMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Excluir apenas este mês
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.fixed_expense_id);
                setDeleteTarget(null);
              }}
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default ManualExpensesPage;
