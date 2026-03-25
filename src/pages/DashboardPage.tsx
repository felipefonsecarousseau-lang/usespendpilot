import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, AlertTriangle, Calendar, Wallet, Target, TrendingDown, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import TrialBanner from "@/components/TrialBanner";
import { generateForecast } from "@/lib/financial-forecast";
import { calculateFinancialScore, type ScoreLevel } from "@/lib/financial-score";
import { generateRecommendations } from "@/lib/financial-advisor";
import FinancialAdvisorCard from "@/components/FinancialAdvisorCard";
import AdvancedInsightsCard from "@/components/AdvancedInsightsCard";
import { useAdvancedInsights } from "@/hooks/useAdvancedInsights";
import MonthlyBudgetCard from "@/components/MonthlyBudgetCard";
import FixedExpensesDashboardCard from "@/components/FixedExpensesDashboardCard";
import PremiumGate from "@/components/PremiumGate";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useFixedExpenseOccurrences } from "@/hooks/useFixedExpenseOccurrences";

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 20, delay: i * 0.08 },
  }),
};

const formatCurrency = (val: number) => {
  const [intPart, decPart] = val.toFixed(2).split(".");
  return (
    <span className="currency-display">
      R$ {intPart}<span className="opacity-50">,{decPart}</span>
    </span>
  );
};

const formatCurrencySimple = (val: number) =>
  `R$ ${val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card p-3 text-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-muted-foreground">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const CAT_COLORS: Record<string, string> = {
  mercado: "hsl(160, 84%, 39%)",
  higiene: "hsl(160, 84%, 28%)",
  limpeza: "hsl(160, 60%, 50%)",
  bebidas: "hsl(215, 16%, 46%)",
  padaria: "hsl(215, 16%, 36%)",
  hortifruti: "hsl(160, 40%, 60%)",
  outros: "hsl(215, 20%, 55%)",
};

const CAT_LABELS: Record<string, string> = {
  mercado: "Supermercado",
  higiene: "Higiene",
  limpeza: "Limpeza",
  bebidas: "Bebidas",
  padaria: "Padaria",
  hortifruti: "Hortifruti",
  outros: "Outros",
};

const SCORE_COLORS: Record<ScoreLevel, string> = {
  critico: "text-destructive",
  alerta: "text-accent",
  bom: "text-primary",
  excelente: "text-primary",
};

const SCORE_LABELS: Record<ScoreLevel, string> = {
  critico: "Crítico",
  alerta: "Alerta",
  bom: "Bom",
  excelente: "Excelente",
};

const DashboardPage = () => {
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { insights: advancedInsights } = useAdvancedInsights();

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];

  // Fixed expense occurrences for current month
  const { totals: fixedTotals } = useFixedExpenseOccurrences(currentMonthStart);

  // Fetch receipts with items for the current month only
  const { data: receipts = [] } = useQuery({
    queryKey: ["dashboard-receipts", currentMonthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("valor_total, data_compra, store_id, stores(nome), receipt_items(categoria, preco_total, nome_normalizado, preco_unitario)")
        .gte("data_compra", currentMonthStart)
        .lt("data_compra", nextMonthStart)
        .order("data_compra", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch manual expenses for current month
  const { data: manualExpenses = [] } = useQuery({
    queryKey: ["dashboard-manual-expenses", currentMonthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_expenses")
        .select("valor, categoria, nome, data")
        .gte("data", currentMonthStart)
        .lt("data", nextMonthStart);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch all receipts for forecast/score (premium features)
  const { data: allReceipts = [] } = useQuery({
    queryKey: ["dashboard-all-receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("valor_total, data_compra, store_id, stores(nome), receipt_items(categoria, preco_total, nome_normalizado, preco_unitario)")
        .order("data_compra", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch ALL manual expenses for forecast/score/advisor (needs historical data)
  const { data: allManualExpenses = [] } = useQuery({
    queryKey: ["dashboard-all-manual-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_expenses")
        .select("valor, categoria, nome, data")
        .order("data", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch family income
  const { data: familyMembers = [] } = useQuery({
    queryKey: ["dashboard-family"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("renda_mensal");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rendaMensal = useMemo(
    () => familyMembers.reduce((s, m) => s + Number(m.renda_mensal), 0),
    [familyMembers]
  );

  // Current month: compute real totals from receipt_items + manual expenses
  const { totalGastoReceipts, spendingData, topCategory } = useMemo(() => {
    const catTotals: Record<string, number> = {};
    let total = 0;

    for (const r of receipts) {
      for (const item of (r as any).receipt_items ?? []) {
        const cat = item.categoria || "outros";
        const preco = Number(item.preco_total) || 0;
        if (preco <= 0) continue;
        catTotals[cat] = (catTotals[cat] || 0) + preco;
        total += preco;
      }
    }

    // Include manual expenses in category breakdown
    for (const me of manualExpenses) {
      const cat = me.categoria || "outros";
      const val = Number(me.valor) || 0;
      if (val <= 0) continue;
      catTotals[cat] = (catTotals[cat] || 0) + val;
      total += val;
    }

    const data = Object.entries(catTotals)
      .map(([cat, value]) => ({
        name: CAT_LABELS[cat] || cat,
        value: Math.round(value * 100) / 100,
        color: CAT_COLORS[cat] || "hsl(215, 20%, 55%)",
        categoria: cat,
      }))
      .sort((a, b) => b.value - a.value);

    const top = data.length > 0 ? data[0] : null;

    return { totalGastoReceipts: Math.round(total * 100) / 100, spendingData: data, topCategory: top };
  }, [receipts, manualExpenses]);

  // Combined total: receipts + fixed expenses
  const totalGasto = totalGastoReceipts + fixedTotals.total;
  const hasData = totalGasto > 0;

  const forecast = useMemo(
    () => generateForecast(allReceipts as any, rendaMensal, fixedTotals.total, manualExpenses as any),
    [allReceipts, rendaMensal, fixedTotals.total, manualExpenses]
  );

  const financialScore = useMemo(
    () => calculateFinancialScore(allReceipts as any, rendaMensal, fixedTotals.total, manualExpenses as any),
    [allReceipts, rendaMensal, fixedTotals.total, manualExpenses]
  );

  const recommendations = useMemo(
    () => generateRecommendations(allReceipts as any, rendaMensal, fixedTotals.total, manualExpenses as any),
    [allReceipts, rendaMensal, fixedTotals.total, manualExpenses]
  );

  // Build alerts from forecast
  const alertas = useMemo(() => {
    const items: { icon: any; text: string; tipo: "warning" | "info" }[] = [];

    if (forecast.saldo_previsto < 0) {
      items.push({
        icon: AlertTriangle,
        text: `Atenção: previsão de deficit de ${formatCurrencySimple(Math.abs(forecast.saldo_previsto))} no final do mês.`,
        tipo: "warning",
      });
    }

    for (const t of forecast.tendencias.slice(0, 2)) {
      items.push({
        icon: TrendingUp,
        text: `Gasto com ${CAT_LABELS[t.categoria] || t.categoria} aumentou ${t.variacao}% este mês.`,
        tipo: "warning",
      });
    }

    if (forecast.dias_restantes > 0 && forecast.dias_restantes <= 5) {
      items.push({
        icon: Calendar,
        text: `Faltam apenas ${forecast.dias_restantes} dias para o fim do mês.`,
        tipo: "info",
      });
    }

    if (items.length === 0) {
      items.push({
        icon: TrendingDown,
        text: "Seus gastos estão dentro do esperado este mês.",
        tipo: "info",
      });
    }

    return items;
  }, [forecast]);

  const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (onboardingLoading) return null;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <TrialBanner />
        {/* Header */}
        <div>
          <p className="text-sm text-muted-foreground capitalize">{monthName}</p>
          <h1 className="text-lg font-medium text-muted-foreground mt-1">Gasto total do mês</h1>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <p className="text-5xl md:text-6xl font-bold tracking-tighter font-mono mt-2 text-foreground">
              {formatCurrency(totalGasto)}
            </p>
            {hasData && rendaMensal > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {topCategory && `Maior gasto: ${topCategory.name} (${formatCurrencySimple(topCategory.value)})`}
              </p>
            )}
            {!hasData && (
              <p className="text-sm text-muted-foreground mt-3">
                Você ainda não registrou gastos neste mês.
              </p>
            )}
          </motion.div>
        </div>

        {/* Monthly budget goal */}
        <MonthlyBudgetCard totalGasto={totalGasto} currentMonthStart={currentMonthStart} />

        {/* Fixed expenses summary */}
        <FixedExpensesDashboardCard total={fixedTotals.total} paid={fixedTotals.paid} pending={fixedTotals.pending} />

        {/* Forecast cards */}
        {hasData && rendaMensal > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Score card */}
            <motion.div custom={0} variants={cardVariants} initial="initial" animate="animate" className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Score Financeiro</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-bold font-mono ${SCORE_COLORS[financialScore.nivel]}`}>
                  {financialScore.score}
                </p>
                <span className={`text-xs ${SCORE_COLORS[financialScore.nivel]}`}>
                  {SCORE_LABELS[financialScore.nivel]}
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="w-full h-1.5 rounded-full bg-muted mt-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    financialScore.nivel === "excelente" || financialScore.nivel === "bom"
                      ? "bg-primary"
                      : financialScore.nivel === "alerta"
                        ? "bg-accent"
                        : "bg-destructive"
                  }`}
                  style={{ width: `${financialScore.score}%` }}
                />
              </div>
            </motion.div>

            <motion.div custom={1} variants={cardVariants} initial="initial" animate="animate" className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Saldo previsto</span>
              </div>
              <p className={`text-xl font-bold font-mono ${forecast.saldo_previsto < 0 ? "text-accent" : "text-primary"}`}>
                {formatCurrencySimple(forecast.saldo_previsto)}
              </p>
            </motion.div>

            <motion.div custom={2} variants={cardVariants} initial="initial" animate="animate" className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Média diária</span>
              </div>
              <p className="text-xl font-bold font-mono text-foreground">
                {formatCurrencySimple(forecast.media_diaria_atual)}
              </p>
            </motion.div>

            <motion.div custom={3} variants={cardVariants} initial="initial" animate="animate" className="glass-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Dias restantes</span>
              </div>
              <p className="text-xl font-bold font-mono text-foreground">{forecast.dias_restantes}</p>
            </motion.div>
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-6">
          {/* Donut Chart */}
          <motion.div
            custom={3}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="glass-card p-6 md:col-span-3"
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              {hasData ? "Previsão por categoria" : "Distribuição por categoria"}
            </h2>
            {spendingData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        strokeWidth={2}
                        stroke="hsl(222, 47%, 2%)"
                        dataKey="value"
                      >
                        {spendingData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {spendingData
                    .sort((a, b) => b.value - a.value)
                    .map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-mono text-xs">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados de compras ainda. Escaneie uma nota fiscal para começar.</p>
            )}
          </motion.div>

          {/* Alertas */}
          <motion.div
            custom={4}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="glass-card p-6 md:col-span-2"
          >
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Pontos de atenção</h2>
            <div className="space-y-3">
              {alertas.map((alerta, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-3 glass-card-inner p-3"
                >
                  <alerta.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                    alerta.tipo === "warning" ? "text-accent" : "text-primary"
                  }`} />
                  <p className="text-sm text-muted-foreground">{alerta.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Premium sections */}
        <PremiumGate inline>
          {/* Spending trends */}
          {forecast.tendencias.length > 0 && (
            <motion.div
              custom={5}
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="glass-card p-6"
            >
              <h2 className="text-sm font-medium text-muted-foreground mb-4">Tendências de aumento</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {forecast.tendencias.map((t, i) => (
                  <div key={i} className="flex items-center justify-between glass-card-inner p-3">
                    <span className="text-sm text-muted-foreground">{CAT_LABELS[t.categoria] || t.categoria}</span>
                    <span className="text-sm font-mono text-accent">+{t.variacao}%</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Forecast message */}
          {hasData && (
            <motion.div
              custom={6}
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="glass-card p-6"
            >
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Previsão financeira</h2>
              <p className="text-sm text-muted-foreground">{forecast.mensagem_gasto}</p>
              {rendaMensal > 0 && (
                <p className={`text-sm mt-2 ${forecast.saldo_previsto < 0 ? "text-accent" : "text-primary"}`}>
                  {forecast.mensagem_saldo}
                </p>
              )}
              {financialScore.score > 0 && (
                <p className="text-sm mt-2 text-muted-foreground">{financialScore.insight}</p>
              )}
            </motion.div>
          )}

          {/* Financial Advisor */}
          {hasData && <FinancialAdvisorCard recommendations={recommendations} />}
        </PremiumGate>

        {/* Advanced Insights — always visible */}
        <AdvancedInsightsCard insights={advancedInsights} />
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
