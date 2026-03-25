import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon,
  CalendarIcon, Filter, ReceiptText, ShoppingCart, Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Color palette ───
const CATEGORY_COLORS: Record<string, string> = {
  supermercado: "hsl(160, 84%, 39%)",
  mercado: "hsl(160, 84%, 39%)",
  streaming: "hsl(280, 65%, 60%)",
  internet: "hsl(200, 80%, 55%)",
  transporte: "hsl(38, 92%, 50%)",
  lazer: "hsl(340, 75%, 55%)",
  contas: "hsl(0, 84%, 60%)",
  higiene: "hsl(190, 70%, 50%)",
  limpeza: "hsl(170, 60%, 45%)",
  bebidas: "hsl(30, 80%, 55%)",
  padaria: "hsl(45, 85%, 55%)",
  hortifruti: "hsl(100, 60%, 45%)",
  outros: "hsl(215, 16%, 56%)",
};
const FALLBACK_COLORS = [
  "hsl(160, 84%, 39%)", "hsl(280, 65%, 60%)", "hsl(38, 92%, 50%)",
  "hsl(200, 80%, 55%)", "hsl(340, 75%, 55%)", "hsl(0, 84%, 60%)",
  "hsl(100, 60%, 45%)", "hsl(45, 85%, 55%)", "hsl(215, 16%, 56%)",
];

type PeriodPreset = "7" | "30" | "90" | "all" | "custom";
type ExpenseType = "all" | "fixo" | "variavel" | "manual";

const periodLabels: Record<string, string> = {
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
  "90": "Últimos 3 meses",
  all: "Todo o período",
  custom: "Personalizado",
};

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const pct = (v: number, total: number) => total > 0 ? ((v / total) * 100).toFixed(1) : "0";

// ─── Main page ───
const GastosDetalhadosPage = () => {
  const [period, setPeriod] = useState<PeriodPreset>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());
  const [expenseType, setExpenseType] = useState<ExpenseType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "all") {
      return { from: new Date("2000-01-01"), to: now };
    }
    if (period === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    const days = period === "custom" ? 30 : Number(period);
    return { from: subDays(now, days), to: now };
  }, [period, customFrom, customTo]);

  const prevDateRange = useMemo(() => {
    const diff = dateRange.to.getTime() - dateRange.from.getTime();
    return { from: new Date(dateRange.from.getTime() - diff), to: new Date(dateRange.from.getTime()) };
  }, [dateRange]);

  // ─── Fetch receipt items (variável) ───
  const { data: receiptItems = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ["gastos-receipt-items", dateRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("receipt_items")
        .select("*, receipts!inner(data_compra, user_id, store_id, stores:store_id(nome))")
        .eq("receipts.user_id", user.id)
        .gte("receipts.data_compra", format(dateRange.from, "yyyy-MM-dd"))
        .lte("receipts.data_compra", format(dateRange.to, "yyyy-MM-dd"));
      return data || [];
    },
    refetchOnWindowFocus: true,
  });

  // ─── Fetch previous period receipt items ───
  const { data: prevReceiptItems = [] } = useQuery({
    queryKey: ["gastos-receipt-items-prev", prevDateRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("receipt_items")
        .select("*, receipts!inner(data_compra, user_id)")
        .eq("receipts.user_id", user.id)
        .gte("receipts.data_compra", format(prevDateRange.from, "yyyy-MM-dd"))
        .lte("receipts.data_compra", format(prevDateRange.to, "yyyy-MM-dd"));
      return data || [];
    },
  });

  // ─── Fetch manual expenses ───
  const { data: manualExpenses = [], isLoading: loadingManual } = useQuery({
    queryKey: ["gastos-manual-expenses", dateRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("manual_expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", format(dateRange.from, "yyyy-MM-dd"))
        .lte("data", format(dateRange.to, "yyyy-MM-dd"));
      return data || [];
    },
    refetchOnWindowFocus: true,
  });

  // ─── Fetch fixed expense occurrences (actual monthly records, date-filtered) ───
  const { data: fixedOccurrences = [], isLoading: loadingFixed } = useQuery({
    queryKey: ["gastos-fixed-occurrences", dateRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("fixed_expense_occurrences")
        .select("valor, mes, status, fixed_expense_id, fixed_expenses!inner(nome, categoria)")
        .eq("user_id", user.id)
        .gte("mes", format(dateRange.from, "yyyy-MM-dd"))
        .lte("mes", format(dateRange.to, "yyyy-MM-dd"));
      return data || [];
    },
    refetchOnWindowFocus: true,
  });

  // ─── Fetch previous period fixed occurrences ───
  const { data: prevFixedOccurrences = [] } = useQuery({
    queryKey: ["gastos-fixed-occurrences-prev", prevDateRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("fixed_expense_occurrences")
        .select("valor, mes, status, fixed_expense_id, fixed_expenses!inner(nome, categoria)")
        .eq("user_id", user.id)
        .gte("mes", format(prevDateRange.from, "yyyy-MM-dd"))
        .lte("mes", format(prevDateRange.to, "yyyy-MM-dd"));
      return data || [];
    },
  });

  // ─── Fetch previous period manual expenses ───
  const { data: prevManualExpenses = [] } = useQuery({
    queryKey: ["gastos-manual-expenses-prev", prevDateRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase
        .from("manual_expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", format(prevDateRange.from, "yyyy-MM-dd"))
        .lte("data", format(prevDateRange.to, "yyyy-MM-dd"));
      return data || [];
    },
  });

  // ─── Aggregate by category ───
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();

    if (expenseType !== "fixo" && expenseType !== "manual") {
      receiptItems.forEach((item: any) => {
        const cat = item.categoria || "outros";
        map.set(cat, (map.get(cat) || 0) + Number(item.preco_total));
      });
    }

    if (expenseType !== "variavel" && expenseType !== "manual") {
      fixedOccurrences.forEach((occ: any) => {
        const cat = ((occ.fixed_expenses as any)?.categoria || "Outros").toLowerCase();
        map.set(cat, (map.get(cat) || 0) + Number(occ.valor));
      });
    }

    if (expenseType !== "variavel" && expenseType !== "fixo") {
      manualExpenses.forEach((me: any) => {
        const cat = (me.categoria || "outros").toLowerCase();
        map.set(cat, (map.get(cat) || 0) + Number(me.valor));
      });
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [receiptItems, fixedOccurrences, manualExpenses, expenseType]);

  // ─── Previous period aggregation for comparison ───
  const prevCategoryData = useMemo(() => {
    const map = new Map<string, number>();
    if (expenseType !== "fixo" && expenseType !== "manual") {
      prevReceiptItems.forEach((item: any) => {
        const cat = item.categoria || "outros";
        map.set(cat, (map.get(cat) || 0) + Number(item.preco_total));
      });
    }
    if (expenseType !== "variavel" && expenseType !== "manual") {
      prevFixedOccurrences.forEach((occ: any) => {
        const cat = ((occ.fixed_expenses as any)?.categoria || "Outros").toLowerCase();
        map.set(cat, (map.get(cat) || 0) + Number(occ.valor));
      });
    }
    if (expenseType !== "variavel" && expenseType !== "fixo") {
      prevManualExpenses.forEach((me: any) => {
        const cat = (me.categoria || "outros").toLowerCase();
        map.set(cat, (map.get(cat) || 0) + Number(me.valor));
      });
    }
    return new Map(map);
  }, [prevReceiptItems, prevFixedOccurrences, prevManualExpenses, expenseType]);

  const totalGasto = categoryData.reduce((s, c) => s + c.value, 0);
  const topCategory = categoryData[0];

  const filteredData = categoryFilter === "all"
    ? categoryData
    : categoryData.filter(c => c.name === categoryFilter);

  // ─── Detail drill-down data ───
  const detailData = useMemo(() => {
    if (!selectedCategory) return { items: [] as any[], subChart: [] as any[] };

    const subMap = new Map<string, number>();
    const items: any[] = [];

    // Receipt items matching category
    receiptItems
      .filter((item: any) => (item.categoria || "outros") === selectedCategory)
      .forEach((item: any) => {
        const receipt = item.receipts as any;
        const storeName = receipt?.stores?.nome || "Desconhecido";
        items.push({
          nome: item.nome_produto,
          valor: Number(item.preco_total),
          data: receipt?.data_compra,
          estabelecimento: storeName,
        });
        const key = item.nome_normalizado || item.nome_produto;
        subMap.set(key, (subMap.get(key) || 0) + Number(item.preco_total));
      });

    // Fixed expense occurrences matching category
    fixedOccurrences
      .filter((occ: any) => ((occ.fixed_expenses as any)?.categoria || "Outros").toLowerCase() === selectedCategory)
      .forEach((occ: any) => {
        const fe = occ.fixed_expenses as any;
        items.push({
          nome: fe?.nome || "Conta fixa",
          valor: Number(occ.valor),
          data: occ.mes,
          estabelecimento: "Conta fixa",
        });
        const key = fe?.nome || "Conta fixa";
        subMap.set(key, (subMap.get(key) || 0) + Number(occ.valor));
      });

    // Manual expenses matching category
    manualExpenses
      .filter((me: any) => (me.categoria || "outros").toLowerCase() === selectedCategory)
      .forEach((me: any) => {
        items.push({
          nome: me.nome || "Gasto manual",
          valor: Number(me.valor),
          data: me.data,
          estabelecimento: me.tipo_pagamento ? `Manual (${me.tipo_pagamento})` : "Manual",
        });
        const key = me.nome || "Gasto manual";
        subMap.set(key, (subMap.get(key) || 0) + Number(me.valor));
      });

    const subChart = Array.from(subMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    items.sort((a, b) => b.valor - a.valor);

    return { items, subChart };
  }, [selectedCategory, receiptItems, fixedOccurrences, manualExpenses]);

  const isLoading = loadingReceipts || loadingFixed || loadingManual;
  const isEmpty = categoryData.length === 0 && !isLoading;

  const getColor = (name: string, i: number) =>
    CATEGORY_COLORS[name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length];

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PieIcon className="h-6 w-6 text-primary" />
            Gastos Detalhados
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize para onde seu dinheiro está indo
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
              <SelectTrigger className="w-[180px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {period === "custom" && (
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {customFrom ? format(customFrom, "dd/MM/yy") : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom}
                    className="p-3 pointer-events-auto" locale={ptBR} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {customTo ? format(customTo, "dd/MM/yy") : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo}
                    className="p-3 pointer-events-auto" locale={ptBR} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <Select value={expenseType} onValueChange={(v) => setExpenseType(v as ExpenseType)}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="variavel">Variáveis</SelectItem>
              <SelectItem value="fixo">Fixos</SelectItem>
              <SelectItem value="manual">Manuais</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px] bg-card border-border">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoryData.map(c => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Empty state */}
        {isEmpty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <ReceiptText className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Sem dados suficientes</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Você ainda não possui gastos suficientes para análise. Adicione despesas ou envie notas fiscais.
            </p>
          </motion.div>
        )}

        {!isEmpty && (
          <>
            {/* KPI cards */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total no período</p>
                      <p className="text-xl font-bold text-foreground">{fmt(totalGasto)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {topCategory && (
                <Card className="bg-card border-border">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-accent/10">
                        <ShoppingCart className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Maior gasto</p>
                        <p className="text-lg font-bold text-foreground capitalize">{topCategory.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {pct(topCategory.value, totalGasto)}% dos gastos
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-secondary">
                      <Wallet className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Categorias</p>
                      <p className="text-xl font-bold text-foreground">{categoryData.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <AnimatePresence mode="wait">
              {!selectedCategory ? (
                <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Main donut */}
                  <Card className="lg:col-span-3 bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={filteredData}
                              cx="50%"
                              cy="50%"
                              innerRadius="55%"
                              outerRadius="80%"
                              dataKey="value"
                              nameKey="name"
                              activeIndex={activeIndex}
                              activeShape={renderActiveShape}
                              onMouseEnter={(_, i) => setActiveIndex(i)}
                              onMouseLeave={() => setActiveIndex(undefined)}
                              onClick={(entry) => setSelectedCategory(entry.name)}
                              className="cursor-pointer outline-none"
                              stroke="hsl(var(--background))"
                              strokeWidth={2}
                            >
                              {filteredData.map((entry, i) => (
                                <Cell key={entry.name} fill={getColor(entry.name, i)} />
                              ))}
                            </Pie>
                            <Tooltip
                              content={({ payload }) => {
                                if (!payload?.length) return null;
                                const d = payload[0];
                                return (
                                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
                                    <p className="font-medium text-foreground capitalize">{d.name}</p>
                                    <p className="text-muted-foreground">{fmt(d.value as number)}</p>
                                    <p className="text-muted-foreground">{pct(d.value as number, totalGasto)}%</p>
                                  </div>
                                );
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        Clique em uma fatia para ver detalhes
                      </p>
                    </CardContent>
                  </Card>

                  {/* Legend + comparison */}
                  <Card className="lg:col-span-2 bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Categorias</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredData.map((cat, i) => {
                        const prev = prevCategoryData.get(cat.name) || 0;
                        const diff = prev > 0 ? ((cat.value - prev) / prev) * 100 : 0;
                        return (
                          <button key={cat.name}
                            onClick={() => setSelectedCategory(cat.name)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-hover transition-colors text-left">
                            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: getColor(cat.name, i) }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-foreground capitalize truncate">{cat.name}</span>
                                <span className="text-sm font-mono text-foreground">{fmt(cat.value)}</span>
                              </div>
                              <div className="flex justify-between items-center mt-0.5">
                                <span className="text-xs text-muted-foreground">{pct(cat.value, totalGasto)}%</span>
                                {diff !== 0 && (
                                  <span className={cn("text-xs flex items-center gap-0.5",
                                    diff > 0 ? "text-destructive" : "text-primary")}>
                                    {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {Math.abs(diff).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                /* ─── Category detail view ─── */
                <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)} className="gap-1">
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sub donut */}
                    {detailData.subChart.length > 0 && (
                      <Card className="bg-card border-border">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base capitalize flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ background: CATEGORY_COLORS[selectedCategory] || FALLBACK_COLORS[0] }} />
                            {selectedCategory} — subdivisão
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={detailData.subChart} cx="50%" cy="50%"
                                  innerRadius="50%" outerRadius="75%" dataKey="value" nameKey="name"
                                  stroke="hsl(var(--background))" strokeWidth={2}>
                                  {detailData.subChart.map((_, i) => (
                                    <Cell key={i} fill={FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip content={({ payload }) => {
                                  if (!payload?.length) return null;
                                  const d = payload[0];
                                  return (
                                    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-xl">
                                      <p className="font-medium text-foreground">{d.name}</p>
                                      <p className="text-muted-foreground">{fmt(d.value as number)}</p>
                                    </div>
                                  );
                                }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Sub legend */}
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {detailData.subChart.map((s, i) => (
                              <div key={s.name} className="flex items-center gap-2 text-xs">
                                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: FALLBACK_COLORS[i % FALLBACK_COLORS.length] }} />
                                <span className="text-muted-foreground truncate">{s.name}</span>
                                <span className="ml-auto font-mono text-foreground">{fmt(s.value)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Items list */}
                    <Card className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Detalhamento ({detailData.items.length} itens)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                          {detailData.items.length === 0 && (
                            <p className="text-muted-foreground text-sm text-center py-8">Nenhum item encontrado.</p>
                          )}
                          {detailData.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                                <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                                  {item.data && <span>{format(new Date(item.data), "dd/MM/yy")}</span>}
                                  <span>{item.estabelecimento}</span>
                                </div>
                              </div>
                              <span className="text-sm font-mono font-medium text-foreground ml-3 shrink-0">
                                {fmt(item.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default GastosDetalhadosPage;
