import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, AlertTriangle, CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

const statusColors: Record<string, string> = {
  pendente: "bg-accent/20 text-accent",
  agendado: "bg-primary/20 text-primary",
  pago: "bg-muted text-muted-foreground",
};

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  agendado: "Agendado",
  pago: "Pago",
};

const ManualExpensesPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [diaRecorrente, setDiaRecorrente] = useState<number>(1);
  const [categoria, setCategoria] = useState(categorias[0]);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Conta recorrente adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar conta."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("fixed_expenses").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fixed_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-expenses"] });
      toast.success("Conta removida.");
    },
    onError: () => toast.error("Erro ao remover conta."),
  });

  const alertas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return expenses
      .filter((e) => {
        if (e.status === "pago") return false;
        const venc = getProximoVencimento(e.dia_vencimento);
        const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 3;
      })
      .map((e) => {
        const venc = getProximoVencimento(e.dia_vencimento);
        const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return { ...e, diasRestantes: diff };
      });
  }, [expenses]);

  const toggleStatus = (id: string, current: string) => {
    const next = current === "pendente" ? "agendado" : current === "agendado" ? "pago" : "pendente";
    updateStatusMutation.mutate({ id, status: next });
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

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contas Recorrentes</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie suas contas fixas e recorrentes.</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>

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
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma conta cadastrada. Clique em "Novo" para começar.
          </div>
        ) : (
          <div className="glass-card divide-y divide-border">
            {expenses.map((expense, i) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-4 gap-4 group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleStatus(expense.id, expense.status)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${statusColors[expense.status]}`}
                  >
                    {statusLabels[expense.status]}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{expense.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.categoria} · Todo dia {expense.dia_vencimento}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">{formatCurrency(expense.valor)}</span>
                  <button
                    onClick={() => deleteMutation.mutate(expense.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ManualExpensesPage;
