import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Pencil, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const formatCurrencySimple = (val: number) =>
  `R$ ${val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

interface MonthlyBudgetCardProps {
  totalGasto: number;
  currentMonthStart: string;
}

const MonthlyBudgetCard = ({ totalGasto, currentMonthStart }: MonthlyBudgetCardProps) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const { data: budget, isLoading } = useQuery({
    queryKey: ["monthly-budget", currentMonthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_budget")
        .select("*")
        .eq("mes", currentMonthStart)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const upsertBudget = useMutation({
    mutationFn: async (valor: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("monthly_budget")
        .upsert(
          { user_id: user.id, mes: currentMonthStart, valor_limite: valor },
          { onConflict: "user_id,mes" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-budget"] });
      setEditing(false);
      toast.success("Meta mensal atualizada!");
    },
    onError: () => toast.error("Erro ao salvar meta."),
  });

  const handleSave = () => {
    const val = parseFloat(inputValue.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!val || val <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    upsertBudget.mutate(val);
  };

  const handleStartEdit = () => {
    setInputValue(budget?.valor_limite ? String(budget.valor_limite) : "");
    setEditing(true);
  };

  if (isLoading) return null;

  const valorLimite = budget?.valor_limite ? Number(budget.valor_limite) : 0;
  const hasBudget = valorLimite > 0;
  const restante = valorLimite - totalGasto;
  const percentual = hasBudget ? Math.min((totalGasto / valorLimite) * 100, 100) : 0;
  const ultrapassou = totalGasto > valorLimite;

  const getBarColor = () => {
    if (!hasBudget) return "bg-primary";
    const pct = (totalGasto / valorLimite) * 100;
    if (pct > 90) return "bg-destructive";
    if (pct > 70) return "bg-accent";
    return "bg-primary";
  };

  const getTextColor = () => {
    if (!hasBudget) return "text-primary";
    const pct = (totalGasto / valorLimite) * 100;
    if (pct > 90) return "text-destructive";
    if (pct > 70) return "text-accent";
    return "text-primary";
  };

  // Empty state — no budget set
  if (!hasBudget && !editing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-muted-foreground">Meta mensal</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Defina uma meta mensal para começar a controlar seus gastos.
        </p>
        <Button size="sm" onClick={handleStartEdit}>
          Definir meta mensal
        </Button>
      </motion.div>
    );
  }

  // Editing state
  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-muted-foreground">
            {hasBudget ? "Editar meta mensal" : "Definir meta mensal"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">R$</span>
          <Input
            type="number"
            min="0"
            step="100"
            placeholder="2000"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="max-w-[200px]"
            autoFocus
          />
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={upsertBudget.isPending}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // Active budget view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-muted-foreground">Sua meta mensal</h2>
        </div>
        <button
          onClick={handleStartEdit}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Values */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Gasto</p>
            <p className={`text-xl font-bold font-mono ${getTextColor()}`}>
              {formatCurrencySimple(totalGasto)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Meta</p>
            <p className="text-xl font-bold font-mono text-foreground">
              {formatCurrencySimple(valorLimite)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentual}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
            className={`h-full rounded-full ${getBarColor()}`}
          />
        </div>

        {/* Remaining or exceeded */}
        {ultrapassou ? (
          <p className="text-sm text-destructive font-medium">
            ⚠️ Você ultrapassou sua meta mensal em {formatCurrencySimple(Math.abs(restante))}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você ainda pode gastar <span className={`font-medium ${getTextColor()}`}>{formatCurrencySimple(restante)}</span> este mês
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default MonthlyBudgetCard;
