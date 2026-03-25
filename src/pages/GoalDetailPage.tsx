import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Loader2, Target, TrendingUp, Clock, PiggyBank, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

interface Goal {
  id: string;
  nome: string;
  valor_alvo: number;
  valor_guardado: number;
}

interface FamilyMember {
  renda_mensal: number;
}

const GoalDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [totalRenda, setTotalRenda] = useState(0);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [editingSaved, setEditingSaved] = useState(false);
  const [editSavedValue, setEditSavedValue] = useState("");

  useEffect(() => {
    fetchGoal();
  }, [id]);

  const fetchGoal = async () => {
    setLoading(true);
    const [goalRes, membersRes] = await Promise.all([
      supabase.from("goals").select("*").eq("id", id!).single(),
      supabase.from("family_members").select("renda_mensal"),
    ]);
    if (goalRes.data) setGoal(goalRes.data as Goal);
    if (membersRes.data) {
      setTotalRenda((membersRes.data as FamilyMember[]).reduce((s, m) => s + m.renda_mensal, 0));
    }
    setLoading(false);
  };

  const addDeposit = async () => {
    if (!depositAmount || !goal) return;
    const newVal = goal.valor_guardado + parseFloat(depositAmount);
    const { error } = await supabase
      .from("goals")
      .update({ valor_guardado: newVal } as any)
      .eq("id", goal.id);
    if (error) { toast.error("Erro ao atualizar."); return; }
    toast.success("Depósito registrado!");
    setDepositAmount("");
    setGoal({ ...goal, valor_guardado: newVal });
  };

  const formatCurrency = (val: number) => {
    const [intPart, decPart] = val.toFixed(2).split(".");
    return <span>R$ {intPart}<span className="opacity-50">,{decPart}</span></span>;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!goal) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Objetivo não encontrado.</p>
          <Link to="/family" className="text-primary text-sm mt-2 inline-block">Voltar</Link>
        </div>
      </AppLayout>
    );
  }

  const pct = goal.valor_alvo > 0 ? Math.min((goal.valor_guardado / goal.valor_alvo) * 100, 100) : 0;
  const faltante = Math.max(goal.valor_alvo - goal.valor_guardado, 0);

  // Estimate: assume family can save ~20% of total income per month toward this goal
  const estimativaPoupancaMensal = totalRenda * 0.2;
  const mesesRestantes = estimativaPoupancaMensal > 0 && faltante > 0
    ? Math.ceil(faltante / estimativaPoupancaMensal)
    : 0;

  const formatMeses = (m: number) => {
    if (m === 0) return "—";
    const anos = Math.floor(m / 12);
    const meses = m % 12;
    if (anos > 0 && meses > 0) return `${anos} ano${anos > 1 ? "s" : ""} e ${meses} ${meses > 1 ? "meses" : "mês"}`;
    if (anos > 0) return `${anos} ano${anos > 1 ? "s" : ""}`;
    return `${meses} ${meses > 1 ? "meses" : "mês"}`;
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <Link to="/family" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{goal.nome}</h1>
              <p className="text-sm text-muted-foreground">Meta: {formatCurrency(goal.valor_alvo)}</p>
            </div>
          </div>

          {/* Progress ring */}
          <div className="glass-card p-6 flex flex-col items-center gap-4">
            <div className="relative h-40 w-40">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{pct.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">concluído</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="glass-card p-4 text-center space-y-1">
              <PiggyBank className="h-4 w-4 mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Guardado</p>
              <p className="text-sm font-semibold">{formatCurrency(goal.valor_guardado)}</p>
            </div>
            <div className="glass-card p-4 text-center space-y-1">
              <TrendingUp className="h-4 w-4 mx-auto text-accent" />
              <p className="text-xs text-muted-foreground">Faltam</p>
              <p className="text-sm font-semibold">{formatCurrency(faltante)}</p>
            </div>
            <div className="glass-card p-4 text-center space-y-1">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Estimativa</p>
              <p className="text-sm font-semibold">{faltante === 0 ? "Concluído! 🎉" : formatMeses(mesesRestantes)}</p>
            </div>
          </div>

          {totalRenda > 0 && faltante > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Estimativa baseada em 20% da renda familiar ({formatCurrency(estimativaPoupancaMensal)}/mês)
            </p>
          )}
          {totalRenda === 0 && faltante > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Cadastre membros da família para ver a estimativa de tempo.
            </p>
          )}

          {/* Deposit */}
          {faltante > 0 && (
            <div className="glass-card p-4 mt-4 space-y-3">
              <p className="text-sm font-medium">Registrar depósito</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Valor"
                  type="number"
                  step="0.01"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  className="bg-secondary"
                />
                <Button size="sm" onClick={addDeposit}>
                  <Plus className="h-4 w-4 mr-1" /> Depositar
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default GoalDetailPage;
