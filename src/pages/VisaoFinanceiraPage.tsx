import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, BarChart3, CalendarRange, Target, Lightbulb, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const fmtShort = (v: number) => `R$ ${v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-sm">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{fmt(payload[0].value)}</p>
    </div>
  );
};

const VisaoFinanceiraPage = () => {
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 4; y--) years.push(y);
    return years;
  }, [currentYear]);

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [viewMode, setViewMode] = useState<"total" | "categoria">("total");

  const yearNum = Number(selectedYear);
  const yearStart = `${yearNum}-01-01`;
  const yearEnd = `${yearNum}-12-31`;
  const prevYearStart = `${yearNum - 1}-01-01`;
  const prevYearEnd = `${yearNum - 1}-12-31`;

  // ─── Fetch receipt items for selected year ───
  const { data: receiptItems = [] } = useQuery({
    queryKey: ["visao-receipts", selectedYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("receipt_items")
        .select("preco_total, categoria, receipts!inner(data_compra, user_id)")
        .eq("receipts.user_id", user.id)
        .gte("receipts.data_compra", yearStart)
        .lte("receipts.data_compra", yearEnd);
      return data || [];
    },
  });

  // ─── Fetch manual expenses for selected year ───
  const { data: manualExpenses = [] } = useQuery({
    queryKey: ["visao-manual", selectedYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("manual_expenses")
        .select("valor, categoria, data")
        .eq("user_id", user.id)
        .gte("data", yearStart)
        .lte("data", yearEnd);
      return data || [];
    },
  });

  // ─── Fetch fixed expense occurrences for selected year ───
  const { data: fixedOccurrences = [] } = useQuery({
    queryKey: ["visao-fixed", selectedYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("fixed_expense_occurrences")
        .select("valor, mes, status")
        .eq("user_id", user.id)
        .gte("mes", yearStart)
        .lte("mes", yearEnd);
      return data || [];
    },
  });

  // ─── Previous year data for comparison ───
  const { data: prevReceiptItems = [] } = useQuery({
    queryKey: ["visao-receipts-prev", selectedYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("receipt_items")
        .select("preco_total, receipts!inner(data_compra, user_id)")
        .eq("receipts.user_id", user.id)
        .gte("receipts.data_compra", prevYearStart)
        .lte("receipts.data_compra", prevYearEnd);
      return data || [];
    },
  });

  const { data: prevManualExpenses = [] } = useQuery({
    queryKey: ["visao-manual-prev", selectedYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("manual_expenses")
        .select("valor, data")
        .eq("user_id", user.id)
        .gte("data", prevYearStart)
        .lte("data", prevYearEnd);
      return data || [];
    },
  });

  const { data: prevFixedOccurrences = [] } = useQuery({
    queryKey: ["visao-fixed-prev", selectedYear],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("fixed_expense_occurrences")
        .select("valor, mes")
        .eq("user_id", user.id)
        .gte("mes", prevYearStart)
        .lte("mes", prevYearEnd);
      return data || [];
    },
  });

  // ─── Aggregate by month ───
  const monthlyData = useMemo(() => {
    const months: Record<number, { total: number; cats: Record<string, number> }> = {};
    for (let m = 0; m < 12; m++) months[m] = { total: 0, cats: {} };

    // Receipt items
    for (const item of receiptItems as any[]) {
      const date = item.receipts?.data_compra;
      if (!date) continue;
      const m = new Date(date + "T00:00:00").getMonth();
      const v = Number(item.preco_total) || 0;
      if (v <= 0) continue;
      const cat = item.categoria || "outros";
      months[m].total += v;
      months[m].cats[cat] = (months[m].cats[cat] || 0) + v;
    }

    // Manual expenses
    for (const me of manualExpenses as any[]) {
      const m = new Date(me.data + "T00:00:00").getMonth();
      const v = Number(me.valor) || 0;
      if (v <= 0) continue;
      const cat = (me.categoria || "outros").toLowerCase();
      months[m].total += v;
      months[m].cats[cat] = (months[m].cats[cat] || 0) + v;
    }

    // Fixed occurrences
    for (const occ of fixedOccurrences as any[]) {
      const m = new Date(occ.mes + "T00:00:00").getMonth();
      const v = Number(occ.valor) || 0;
      if (v <= 0) continue;
      months[m].total += v;
      months[m].cats["contas fixas"] = (months[m].cats["contas fixas"] || 0) + v;
    }

    return Array.from({ length: 12 }, (_, i) => ({
      month: MONTH_LABELS[i],
      monthIndex: i,
      total: Math.round(months[i].total * 100) / 100,
      cats: months[i].cats,
    }));
  }, [receiptItems, manualExpenses, fixedOccurrences]);

  // ─── Previous year total ───
  const prevYearTotal = useMemo(() => {
    let total = 0;
    for (const item of prevReceiptItems as any[]) total += Number(item.preco_total) || 0;
    for (const me of prevManualExpenses as any[]) total += Number(me.valor) || 0;
    for (const occ of prevFixedOccurrences as any[]) total += Number(occ.valor) || 0;
    return Math.round(total * 100) / 100;
  }, [prevReceiptItems, prevManualExpenses, prevFixedOccurrences]);

  // ─── Computed stats ───
  const now = new Date();
  const currentMonthIndex = yearNum === now.getFullYear() ? now.getMonth() : 11;
  const prevMonthIndex = currentMonthIndex > 0 ? currentMonthIndex - 1 : null;

  const monthsWithData = monthlyData.filter(m => m.total > 0);
  const totalYear = monthlyData.reduce((s, m) => s + m.total, 0);
  const mediaMensal = monthsWithData.length > 0 ? totalYear / monthsWithData.length : 0;
  const projecaoAnual = mediaMensal * 12;

  const currentMonthTotal = monthlyData[currentMonthIndex]?.total || 0;
  const prevMonthTotal = prevMonthIndex !== null ? (monthlyData[prevMonthIndex]?.total || 0) : 0;
  const monthVariation = prevMonthTotal > 0
    ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100
    : 0;

  const yearVariation = prevYearTotal > 0
    ? ((totalYear - prevYearTotal) / prevYearTotal) * 100
    : 0;

  // ─── Category breakdown for bar chart ───
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    monthlyData.forEach(m => Object.keys(m.cats).forEach(c => cats.add(c)));
    return [...cats].sort();
  }, [monthlyData]);

  const CAT_COLORS: Record<string, string> = {
    mercado: "hsl(160, 84%, 39%)",
    supermercado: "hsl(160, 84%, 39%)",
    higiene: "hsl(190, 70%, 50%)",
    limpeza: "hsl(170, 60%, 45%)",
    bebidas: "hsl(30, 80%, 55%)",
    padaria: "hsl(45, 85%, 55%)",
    hortifruti: "hsl(100, 60%, 45%)",
    transporte: "hsl(38, 92%, 50%)",
    streaming: "hsl(280, 65%, 60%)",
    lazer: "hsl(340, 75%, 55%)",
    "contas fixas": "hsl(0, 84%, 60%)",
    outros: "hsl(215, 16%, 56%)",
  };

  const isEmpty = totalYear === 0;

  // ─── Insights ───
  const insights = useMemo(() => {
    const msgs: string[] = [];
    if (mediaMensal > 0) {
      msgs.push(`Se continuar nesse ritmo, você gastará ${fmtShort(projecaoAnual)} este ano.`);
    }
    if (monthVariation !== 0 && prevMonthTotal > 0) {
      const dir = monthVariation > 0 ? "aumentou" : "reduziu";
      msgs.push(`Você ${dir} seus gastos em ${Math.abs(monthVariation).toFixed(1)}% comparado ao mês passado.`);
    }
    if (mediaMensal > 0) {
      const economia10 = mediaMensal * 0.1 * 12;
      msgs.push(`Reduzindo 10%, você economizaria ${fmtShort(economia10)} no ano.`);
    }
    if (prevYearTotal > 0 && yearVariation !== 0) {
      const dir = yearVariation > 0 ? "aumento" : "redução";
      msgs.push(`Comparado a ${yearNum - 1}, houve ${dir} de ${Math.abs(yearVariation).toFixed(1)}% nos gastos.`);
    }
    return msgs;
  }, [mediaMensal, projecaoAnual, monthVariation, prevMonthTotal, prevYearTotal, yearVariation, yearNum]);

  const cardAnim = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.08 } },
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Visão Financeira
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Evolução, projeção e comparação dos seus gastos
          </p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "total" | "categoria")}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Total por mês</SelectItem>
              <SelectItem value="categoria">Por categoria</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isEmpty ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarRange className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Sem dados para {selectedYear}</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Adicione gastos para visualizar sua evolução financeira.
            </p>
          </motion.div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div {...cardAnim(0)}>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Média mensal</span>
                    </div>
                    <p className="text-xl font-bold font-mono text-foreground">{fmtShort(mediaMensal)}</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div {...cardAnim(1)}>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarRange className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Projeção anual</span>
                    </div>
                    <p className="text-xl font-bold font-mono text-foreground">{fmtShort(projecaoAnual)}</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div {...cardAnim(2)}>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {monthVariation >= 0
                        ? <ArrowUpRight className="h-4 w-4 text-accent" />
                        : <ArrowDownRight className="h-4 w-4 text-primary" />}
                      <span className="text-xs text-muted-foreground">vs. mês anterior</span>
                    </div>
                    <p className={`text-xl font-bold font-mono ${monthVariation > 0 ? "text-accent" : "text-primary"}`}>
                      {monthVariation > 0 ? "+" : ""}{monthVariation.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fmtShort(currentMonthTotal)} vs {fmtShort(prevMonthTotal)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div {...cardAnim(3)}>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      {yearVariation >= 0
                        ? <TrendingUp className="h-4 w-4 text-accent" />
                        : <TrendingDown className="h-4 w-4 text-primary" />}
                      <span className="text-xs text-muted-foreground">vs. {yearNum - 1}</span>
                    </div>
                    {prevYearTotal > 0 ? (
                      <>
                        <p className={`text-xl font-bold font-mono ${yearVariation > 0 ? "text-accent" : "text-primary"}`}>
                          {yearVariation > 0 ? "+" : ""}{yearVariation.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {fmtShort(totalYear)} vs {fmtShort(prevYearTotal)}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem dados</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Chart */}
            <motion.div {...cardAnim(4)} className="glass-card p-6">
              <h2 className="text-sm font-medium text-muted-foreground mb-4">
                Evolução mês a mês — {selectedYear}
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 16%)" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(215, 16%, 56%)", fontSize: 12 }} />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fill: "hsl(215, 16%, 56%)", fontSize: 12 }}
                      width={45}
                    />
                    <Tooltip content={<ChartTooltipContent />} />
                    {viewMode === "total" ? (
                      <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={40}>
                        {monthlyData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={i === currentMonthIndex && yearNum === now.getFullYear()
                              ? "hsl(160, 84%, 39%)"
                              : "hsl(215, 25%, 20%)"}
                          />
                        ))}
                      </Bar>
                    ) : (
                      allCategories.map((cat, ci) => (
                        <Bar
                          key={cat}
                          dataKey={`cats.${cat}`}
                          name={cat}
                          stackId="stack"
                          fill={CAT_COLORS[cat] || `hsl(${ci * 50}, 50%, 50%)`}
                          radius={ci === allCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          maxBarSize={40}
                        />
                      ))
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category legend for stacked mode */}
              {viewMode === "categoria" && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {allCategories.map((cat, ci) => (
                    <div key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CAT_COLORS[cat] || `hsl(${ci * 50}, 50%, 50%)` }}
                      />
                      <span className="capitalize">{cat}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Insights */}
            {insights.length > 0 && (
              <motion.div {...cardAnim(5)} className="glass-card p-6">
                <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-accent" />
                  Insights
                </h2>
                <div className="space-y-3">
                  {insights.map((msg, i) => (
                    <div key={i} className="glass-card-inner p-3 text-sm text-muted-foreground">
                      {msg}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default VisaoFinanceiraPage;
