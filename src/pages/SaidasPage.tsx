import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ScanLine, Zap, RotateCcw, Plus, Trash2, AlertTriangle,
  CalendarClock, Loader2, CheckCircle2, Clock, Receipt, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppLayout from "@/components/AppLayout";
import { QuickAddExpenseModal } from "@/components/QuickAddExpenseModal";
import InvoiceScanContent from "@/components/InvoiceScanContent";
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

interface ManualExpense {
  id: string;
  nome: string;
  valor: number;
  categoria: string;
  data: string;
}

interface RecentReceipt {
  id: string;
  valor_total: number;
  data_compra: string;
  store_nome: string | null;
}

type RecentEntry =
  | { kind: "manual"; id: string; nome: string; valor: number; categoria: string; data: string }
  | { kind: "nota"; id: string; nome: string; valor: number; categoria: string; data: string };

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

const SaidasPage = () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const queryClient = useQueryClient();

  // Modal state
  const [scanOpen, setScanOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Fixed expense form state
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [diaRecorrente, setDiaRecorrente] = useState<number>(1);
  const [categoria, setCategoria] = useState(categorias[0]);
  const [deleteTarget, setDeleteTarget] = useState<Occurrence | null>(null);

  // --- Fixed expenses data ---
  const { data: _expenses = [], isLoading: loadingExpenses } = useQuery({
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

  // --- Recent expenses data ---
  const { data: manualExpenses = [], isLoading: loadingManual } = useQuery({
    queryKey: ["saidas-manual-recent"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("manual_expenses")
        .select("id, nome, valor, categoria, data")
        .eq("user_id", user.id)
        .order("data", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ManualExpense[];
    },
  });

  const { data: recentReceipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ["saidas-receipts-recent"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: receipts, error } = await supabase
        .from("receipts")
        .select("id, valor_total, data_compra, store_id")
        .eq("user_id", user.id)
        .order("data_compra", { ascending: false })
        .limit(10);
      if (error) throw error;

      const storeIds = [...new Set(receipts.map((r) => r.store_id).filter(Boolean))];
      const storeMap = new Map<string, string>();
      if (storeIds.length > 0) {
        const { data: stores } = await supabase
          .from("stores")
          .select("id, nome")
          .in("id", storeIds);
        stores?.forEach((s) => storeMap.set(s.id, s.nome));
      }

      return receipts.map((r) => ({
        id: r.id,
        valor_total: r.valor_total,
        data_compra: r.data_compra,
        store_nome: r.store_id ? (storeMap.get(r.store_id) ?? null) : null,
      })) as RecentReceipt[];
    },
  });

  // Merge and sort recent entries
  const recentEntries = useMemo((): RecentEntry[] => {
    const manual: RecentEntry[] = manualExpenses.map((e) => ({
      kind: "manual",
      id: e.id,
      nome: e.nome,
      valor: e.valor,
      categoria: e.categoria,
      data: e.data,
    }));
    const notas: RecentEntry[] = recentReceipts.map((r) => ({
      kind: "nota",
      id: r.id,
      nome: r.store_nome ?? "Nota fiscal",
      valor: r.valor_total,
      categoria: "mercado",
      data: r.data_compra,
    }));
    return [...manual, ...notas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 25);
  }, [manualExpenses, recentReceipts]);

  // Monthly summary
  const monthlyTotal = useMemo(() => {
    const manualTotal = manualExpenses
      .filter((e) => e.data >= currentMonthStart && e.data <= currentMonthEnd)
      .reduce((s, e) => s + e.valor, 0);
    const receiptsTotal = recentReceipts
      .filter((r) => r.data_compra >= currentMonthStart && r.data_compra <= currentMonthEnd)
      .reduce((s, r) => s + r.valor_total, 0);
    return manualTotal + receiptsTotal + totals.total;
  }, [manualExpenses, recentReceipts, totals, currentMonthStart, currentMonthEnd]);

  // Alerts for upcoming fixed expenses
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

  const addFixedExpense = () => {
    if (!nome || !valor) {
      toast.error("Preencha todos os campos.");
      return;
    }
    addMutation.mutate({ nome, valor: parseFloat(valor), dia_vencimento: diaRecorrente, categoria });
    setNome("");
    setValor("");
    setDiaRecorrente(1);
    setCategoria(categorias[0]);
    setShowFixedForm(false);
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

  const isLoadingFixed = loadingExpenses || loadingOcc;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saídas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle tudo que sai do seu dinheiro em um só lugar
          </p>
        </div>

        {/* Block 4 — Monthly summary */}
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground capitalize mb-1">{monthName}</p>
          <p className="text-xs text-muted-foreground">Total gasto no mês</p>
          <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
            {formatSimple(monthlyTotal)}
          </p>
          {totals.total > 0 && (
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                Fixas pagas: {formatSimple(totals.paid)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-accent" />
                Fixas pendentes: {formatSimple(totals.pending)}
              </span>
            </div>
          )}
        </div>

        {/* Block 1 — Quick actions */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Ações rápidas
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setScanOpen(true)}
              className="glass-card flex flex-col items-center gap-2 p-4 hover:border-primary/30 transition-colors text-center"
            >
              <div className="rounded-full bg-primary/10 p-2">
                <ScanLine className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">Escanear nota</span>
            </button>
            <button
              onClick={() => setQuickAddOpen(true)}
              className="glass-card flex flex-col items-center gap-2 p-4 hover:border-accent/30 transition-colors text-center"
            >
              <div className="rounded-full bg-accent/10 p-2">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">Gasto rápido</span>
            </button>
            <button
              onClick={() => setShowFixedForm(true)}
              className="glass-card flex flex-col items-center gap-2 p-4 hover:border-border transition-colors text-center"
            >
              <div className="rounded-full bg-muted p-2">
                <RotateCcw className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">Nova conta fixa</span>
            </button>
          </div>
        </div>

        {/* Block 2 — Contas fixas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Contas fixas
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowFixedForm(!showFixedForm)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo
            </Button>
          </div>

          {/* Summary */}
          {totals.total > 0 && (
            <div className="glass-card p-4 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground capitalize">{monthName}</p>
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
            <div className="space-y-2 mb-3">
              {alertas.map((a) => (
                <Alert key={a.id} variant="destructive" className="border-destructive/30 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>{a.nome}</strong> vence{" "}
                    {a.diasRestantes === 0 ? "hoje" : `em ${a.diasRestantes} dia${a.diasRestantes > 1 ? "s" : ""}`}{" "}
                    — {formatCurrency(a.valor)}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Add form */}
          {showFixedForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="glass-card p-4 space-y-3 mb-3"
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
                <Button variant="outline" size="sm" onClick={() => setShowFixedForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={addFixedExpense} disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Adicionar
                </Button>
              </div>
            </motion.div>
          )}

          {isLoadingFixed ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : occurrences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm glass-card">
              Adicione contas fixas para prever seus gastos mensais.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOccs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Pendentes ({pendingOccs.length})
                  </p>
                  <div className="glass-card divide-y divide-border">
                    {pendingOccs.map((occ, i) => (
                      <motion.div
                        key={occ.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-4 gap-4 group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleStatus(occ)}
                            className="text-xs px-2 py-0.5 rounded-full font-medium bg-accent/20 text-accent hover:bg-primary/20 hover:text-primary transition-colors shrink-0"
                            title="Marcar como pago"
                          >
                            Pendente
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{occ.nome}</p>
                            <p className="text-xs text-muted-foreground">{occ.categoria} · Dia {occ.dia_vencimento}</p>
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

              {paidOccs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Pagas ({paidOccs.length})
                  </p>
                  <div className="glass-card divide-y divide-border">
                    {paidOccs.map((occ, i) => (
                      <motion.div
                        key={occ.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-4 gap-4 group opacity-60"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleStatus(occ)}
                            className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/20 text-primary hover:bg-accent/20 hover:text-accent transition-colors shrink-0"
                            title="Desfazer pagamento"
                          >
                            Pago
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate line-through">{occ.nome}</p>
                            <p className="text-xs text-muted-foreground">{occ.categoria} · Dia {occ.dia_vencimento}</p>
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

        {/* Block 3 — Recent expenses */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Gastos recentes
          </h2>
          {loadingManual || loadingReceipts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm glass-card">
              Nenhum gasto registrado ainda.
            </div>
          ) : (
            <div className="glass-card divide-y divide-border">
              {recentEntries.map((entry, i) => (
                <motion.div
                  key={`${entry.kind}-${entry.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between p-4 gap-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`rounded-full p-1.5 shrink-0 ${entry.kind === "nota" ? "bg-primary/10" : "bg-accent/10"}`}>
                      {entry.kind === "nota" ? (
                        <ScanLine className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.nome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {entry.categoria}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          entry.kind === "nota"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/10 text-accent"
                        }`}>
                          {entry.kind === "nota" ? "nota" : "manual"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-mono shrink-0">{formatCurrency(entry.valor)}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Scan modal */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escanear Nota Fiscal</DialogTitle>
          </DialogHeader>
          <InvoiceScanContent
            showSavedList={false}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["saidas-receipts-recent"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Quick add modal */}
      <QuickAddExpenseModal
        open={quickAddOpen}
        onClose={() => {
          setQuickAddOpen(false);
          queryClient.invalidateQueries({ queryKey: ["saidas-manual-recent"] });
        }}
      />

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

export default SaidasPage;
