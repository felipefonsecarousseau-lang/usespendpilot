import { useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, AlertTriangle, TrendingDown, Scissors, BarChart3, ArrowDownRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildUnifiedTransactions, filterByDateRange, type UnifiedTransaction } from "@/lib/unified-transactions";
import { analyzeSpendingHealth, type SpendingHealthResult } from "@/lib/spending-health-engine";

const fmtStr = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

const SCORE_COLORS: Record<string, string> = {
  critico: "text-destructive",
  alerta: "text-accent",
  bom: "text-primary",
  excelente: "text-primary",
};

const SCORE_LABELS: Record<string, string> = {
  critico: "Crítico",
  alerta: "Atenção",
  bom: "Bom",
  excelente: "Excelente",
};

const ACTION_ICONS: Record<string, typeof TrendingDown> = {
  reduzir: TrendingDown,
  otimizar: BarChart3,
  cortar: Scissors,
};

const ACTION_LABELS: Record<string, string> = {
  reduzir: "Reduzir",
  otimizar: "Otimizar",
  cortar: "Cortar",
};

interface Props {
  period: string; // "30" | "90" | "180"
}

const OutrosGastosView = ({ period }: Props) => {
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString().split("T")[0];
  }, [period]);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["economia-outros-gastos", period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [manualRes, fixedOccRes, familyRes, variableIncomeRes] = await Promise.all([
        supabase
          .from("manual_expenses")
          .select("valor, data, categoria, nome")
          .eq("user_id", user.id)
          .gte("data", cutoffDate)
          .lte("data", today),
        supabase
          .from("fixed_expense_occurrences")
          .select("valor, mes, status, fixed_expense_id")
          .eq("user_id", user.id)
          .gte("mes", cutoffDate)
          .lte("mes", today),
        supabase
          .from("family_members")
          .select("renda_mensal")
          .eq("user_id", user.id),
        supabase
          .from("variable_income")
          .select("valor, data")
          .eq("user_id", user.id)
          .gte("data", cutoffDate)
          .lte("data", today),
      ]);

      if (manualRes.error) throw manualRes.error;
      if (fixedOccRes.error) throw fixedOccRes.error;

      // Get fixed expense names
      const fixedIds = [...new Set((fixedOccRes.data || []).map((o) => o.fixed_expense_id))];
      let fixedExpenses: { id: string; nome: string; categoria: string }[] = [];
      if (fixedIds.length > 0) {
        const { data } = await supabase
          .from("fixed_expenses")
          .select("id, nome, categoria")
          .in("id", fixedIds);
        fixedExpenses = data || [];
      }
      const feMap = new Map(fixedExpenses.map((f) => [f.id, f]));

      const rendaFixa = (familyRes.data || []).reduce((s, m) => s + Number(m.renda_mensal), 0);
      // Spread variable income over the analysis period proportionally (per month)
      const periodMonths = Math.max(Number(period) / 30, 1);
      const rendaVariavel = (variableIncomeRes.data || []).reduce((s, i) => s + Number(i.valor), 0) / periodMonths;
      const rendaMensal = rendaFixa + rendaVariavel;

      const txs = buildUnifiedTransactions(
        [],
        (manualRes.data || []).map((m) => ({
          valor: m.valor,
          data: m.data,
          categoria: m.categoria,
          nome: m.nome,
        })),
        (fixedOccRes.data || []).map((o) => {
          const fe = feMap.get(o.fixed_expense_id);
          return {
            valor: o.valor,
            mes: o.mes,
            status: o.status,
            nome: fe?.nome,
            categoria: fe?.categoria,
          };
        }),
      );

      const filtered = filterByDateRange(txs, cutoffDate, today);
      return analyzeSpendingHealth(filtered, rendaMensal);
    },
  });

  if (isLoading) {
    return (
      <div className="glass-card p-12 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Analisando seus gastos...</p>
      </div>
    );
  }

  if (!analysis || (analysis.categoriaPesos.length === 0)) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-12 flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <BarChart3 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">Sem dados suficientes</p>
          <p className="text-sm text-muted-foreground mt-1">Adicione gastos manuais ou contas fixas para ver análises.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-primary/10 p-2.5">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Saúde Financeira</h2>
        </div>

        <div className="flex items-end gap-4 mb-4">
          <span className={`text-5xl font-bold ${SCORE_COLORS[analysis.nivel]}`}>
            {analysis.score}
          </span>
          <div className="pb-1">
            <span className={`text-sm font-medium ${SCORE_COLORS[analysis.nivel]}`}>
              {SCORE_LABELS[analysis.nivel]}
            </span>
            <p className="text-xs text-muted-foreground">de 100 pontos</p>
          </div>
        </div>

        {/* Fixed vs variable bar */}
        <div className="glass-card-inner p-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Fixos: {fmtStr(analysis.fixoVsVariavel.fixo)}/mês</span>
            <span>Variáveis: {fmtStr(analysis.fixoVsVariavel.variavel)}/mês</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
            <div
              className="h-full bg-accent rounded-l-full transition-all"
              style={{ width: `${(analysis.fixoVsVariavel.pctFixo * 100).toFixed(0)}%` }}
            />
            <div
              className="h-full bg-primary rounded-r-full transition-all"
              style={{ width: `${((1 - analysis.fixoVsVariavel.pctFixo) * 100).toFixed(0)}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-xs text-muted-foreground">Fixos ({(analysis.fixoVsVariavel.pctFixo * 100).toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Variáveis ({((1 - analysis.fixoVsVariavel.pctFixo) * 100).toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Patterns & Recommendations */}
      {analysis.patterns.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-accent/10 p-2.5">
              <AlertTriangle className="h-5 w-5 text-accent" />
            </div>
            <h2 className="text-lg font-semibold">
              {analysis.nivel === "critico" ? "Ações Urgentes" : "Recomendações"}
            </h2>
          </div>
          <div className="space-y-3">
            {analysis.patterns.map((p, i) => {
              const Icon = ACTION_ICONS[p.acao] || ArrowDownRight;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="glass-card-inner p-4 flex gap-3"
                >
                  <span className="text-lg shrink-0">{p.icone}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{p.titulo}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {ACTION_LABELS[p.acao]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.mensagem}</p>
                    {p.impacto > 0 && (
                      <p className="text-xs text-primary mt-1 currency-display">
                        Impacto potencial: {fmtStr(p.impacto)}/mês
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Category breakdown */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-primary/10 p-2.5">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Distribuição por Categoria</h2>
        </div>
        <div className="space-y-3">
          {analysis.categoriaPesos.map((c, i) => (
            <div key={c.categoria} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize font-medium">{c.categoria}</span>
                <span className="font-mono text-muted-foreground">{fmtStr(c.total)} ({(c.pct * 100).toFixed(0)}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.pct * 100).toFixed(0)}%` }}
                  transition={{ delay: 0.15 + i * 0.04, duration: 0.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default OutrosGastosView;
