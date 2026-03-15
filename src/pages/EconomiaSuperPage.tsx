import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Award, ShoppingCart, PiggyBank, SlidersHorizontal, ReceiptText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Period = "30" | "90" | "180";
const CATEGORIES = ["mercado", "higiene", "limpeza", "bebidas", "padaria", "hortifruti", "outros"] as const;

const formatCurrency = (val: number) => (
  <span className="currency-display">
    R$ {val.toFixed(2).replace(".", ",")}
  </span>
);

const EconomiaSuperPage = () => {
  const [period, setPeriod] = useState<Period>("90");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [storeFilter, setStoreFilter] = useState<string>("all");

  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    return d.toISOString().split("T")[0];
  }, [period]);

  // Fetch all data in one query
  const { data, isLoading } = useQuery({
    queryKey: ["economia-super", period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get receipts in period
      const { data: receipts, error: rErr } = await supabase
        .from("receipts")
        .select("id, store_id, data_compra, valor_total")
        .eq("user_id", user.id)
        .gte("data_compra", cutoffDate);
      if (rErr) throw rErr;
      if (!receipts?.length) return { receipts: [], items: [], stores: [] };

      const receiptIds = receipts.map((r) => r.id);
      const storeIds = [...new Set(receipts.map((r) => r.store_id))];

      const [itemsRes, storesRes] = await Promise.all([
        supabase
          .from("receipt_items")
          .select("receipt_id, nome_produto, nome_normalizado, categoria, quantidade, preco_unitario, preco_total")
          .in("receipt_id", receiptIds),
        supabase
          .from("stores")
          .select("id, nome, cnpj")
          .in("id", storeIds),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (storesRes.error) throw storesRes.error;

      return {
        receipts: receipts || [],
        items: itemsRes.data || [],
        stores: storesRes.data || [],
      };
    },
  });

  const storesMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.stores?.forEach((s) => map.set(s.id, s.nome));
    return map;
  }, [data?.stores]);

  const receiptStoreMap = useMemo(() => {
    const map = new Map<string, string>();
    data?.receipts?.forEach((r) => map.set(r.id, r.store_id));
    return map;
  }, [data?.receipts]);

  // Build enriched items with store info
  const enrichedItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items
      .map((item) => ({
        ...item,
        store_id: receiptStoreMap.get(item.receipt_id) || "",
        store_nome: storesMap.get(receiptStoreMap.get(item.receipt_id) || "") || "Desconhecido",
      }))
      .filter((item) => {
        if (categoryFilter !== "all" && item.categoria !== categoryFilter) return false;
        if (storeFilter !== "all" && item.store_id !== storeFilter) return false;
        return true;
      });
  }, [data?.items, receiptStoreMap, storesMap, categoryFilter, storeFilter]);

  // 1. Ranking de Supermercados
  const storeRanking = useMemo(() => {
    const map = new Map<string, { total: number; count: number; nome: string }>();
    enrichedItems.forEach((item) => {
      const existing = map.get(item.store_id) || { total: 0, count: 0, nome: item.store_nome };
      existing.total += item.preco_unitario;
      existing.count += 1;
      map.set(item.store_id, existing);
    });
    return [...map.entries()]
      .map(([id, v]) => ({ id, nome: v.nome, avgPrice: v.total / v.count, purchases: v.count }))
      .sort((a, b) => a.avgPrice - b.avgPrice);
  }, [enrichedItems]);

  // 2. Comparação por produto
  const productComparison = useMemo(() => {
    const map = new Map<string, Map<string, { total: number; count: number; storeNome: string }>>();
    enrichedItems.forEach((item) => {
      if (!map.has(item.nome_normalizado)) map.set(item.nome_normalizado, new Map());
      const storeMap = map.get(item.nome_normalizado)!;
      const existing = storeMap.get(item.store_id) || { total: 0, count: 0, storeNome: item.store_nome };
      existing.total += item.preco_unitario;
      existing.count += 1;
      storeMap.set(item.store_id, existing);
    });

    const rows: { produto: string; supermercado: string; precoMedio: number; compras: number }[] = [];
    map.forEach((storeMap, produto) => {
      storeMap.forEach((v) => {
        rows.push({ produto, supermercado: v.storeNome, precoMedio: v.total / v.count, compras: v.count });
      });
    });
    return rows.sort((a, b) => a.produto.localeCompare(b.produto) || a.precoMedio - b.precoMedio);
  }, [enrichedItems]);

  // 3. Sugestões de economia
  const suggestions = useMemo(() => {
    const map = new Map<string, { store: string; avg: number; count: number }[]>();
    enrichedItems.forEach((item) => {
      if (!map.has(item.nome_normalizado)) map.set(item.nome_normalizado, []);
    });

    // Build per-product per-store averages
    const prodStoreMap = new Map<string, Map<string, { total: number; count: number; nome: string }>>();
    enrichedItems.forEach((item) => {
      if (!prodStoreMap.has(item.nome_normalizado)) prodStoreMap.set(item.nome_normalizado, new Map());
      const sm = prodStoreMap.get(item.nome_normalizado)!;
      const existing = sm.get(item.store_id) || { total: 0, count: 0, nome: item.store_nome };
      existing.total += item.preco_unitario;
      existing.count += 1;
      sm.set(item.store_id, existing);
    });

    const result: { produto: string; msg: string; economia: number }[] = [];
    prodStoreMap.forEach((stores, produto) => {
      if (stores.size < 2) return;
      const entries = [...stores.values()].map((v) => ({ nome: v.nome, avg: v.total / v.count }));
      entries.sort((a, b) => a.avg - b.avg);
      const cheapest = entries[0];
      const mostExpensive = entries[entries.length - 1];
      const diff = mostExpensive.avg - cheapest.avg;
      const pct = Math.round((diff / mostExpensive.avg) * 100);
      if (pct >= 5) {
        result.push({
          produto,
          msg: `${produto} costuma ser ${pct}% mais barato no ${cheapest.nome}. Você paga em média ${formatMoney(mostExpensive.avg)} no ${mostExpensive.nome}, mas já encontrou por ${formatMoney(cheapest.avg)} no ${cheapest.nome}.`,
          economia: diff,
        });
      }
    });
    return result.sort((a, b) => b.economia - a.economia);
  }, [enrichedItems]);

  // 4. Economia potencial
  const potentialSavings = useMemo(() => {
    const prodStoreMap = new Map<string, { store: string; avg: number; totalSpent: number; count: number }[]>();
    enrichedItems.forEach((item) => {
      const key = item.nome_normalizado;
      if (!prodStoreMap.has(key)) prodStoreMap.set(key, []);
    });

    const prodStoreBuild = new Map<string, Map<string, { totalPrice: number; count: number; nome: string }>>();
    enrichedItems.forEach((item) => {
      if (!prodStoreBuild.has(item.nome_normalizado)) prodStoreBuild.set(item.nome_normalizado, new Map());
      const sm = prodStoreBuild.get(item.nome_normalizado)!;
      const existing = sm.get(item.store_id) || { totalPrice: 0, count: 0, nome: item.store_nome };
      existing.totalPrice += item.preco_total;
      existing.count += 1;
      sm.set(item.store_id, existing);
    });

    let totalSavings = 0;
    const topVariations: { produto: string; diff: number }[] = [];

    prodStoreBuild.forEach((stores, produto) => {
      const entries = [...stores.values()];
      const avgPrices = entries.map((e) => e.totalPrice / e.count);
      const minAvg = Math.min(...avgPrices);
      entries.forEach((e) => {
        const avg = e.totalPrice / e.count;
        totalSavings += (avg - minAvg) * e.count;
      });
      if (entries.length > 1) {
        const maxAvg = Math.max(...avgPrices);
        topVariations.push({ produto, diff: maxAvg - minAvg });
      }
    });

    topVariations.sort((a, b) => b.diff - a.diff);

    const cheapestStore = storeRanking[0]?.nome || "";
    return { totalSavings, topVariations: topVariations.slice(0, 5), cheapestStore };
  }, [enrichedItems, storeRanking]);

  const isEmpty = !isLoading && (!data?.items?.length);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Economia no Supermercado</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compare preços e descubra onde economizar.
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[140px] bg-card border-border">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">3 meses</SelectItem>
                <SelectItem value="180">6 meses</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] bg-card border-border">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(data?.stores?.length ?? 0) > 0 && (
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-[160px] bg-card border-border">
                  <SelectValue placeholder="Supermercado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {data?.stores?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="glass-card p-12 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando análises...</p>
          </div>
        )}

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 flex flex-col items-center gap-4 text-center"
          >
            <div className="rounded-full bg-primary/10 p-4">
              <ReceiptText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Sem dados suficientes</p>
              <p className="text-sm text-muted-foreground mt-1">
                Envie algumas notas fiscais para começar a comparar preços entre supermercados.
              </p>
            </div>
          </motion.div>
        )}

        {!isLoading && !isEmpty && (
          <div className="space-y-6">
            {/* Economia Potencial - Hero */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <PiggyBank className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Economia Potencial</h2>
              </div>
              <p className="text-3xl font-bold text-primary currency-display mb-2">
                R$ {potentialSavings.totalSavings.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-sm text-muted-foreground">
                Você poderia economizar esse valor comprando sempre no supermercado mais barato para cada produto.
              </p>
              {potentialSavings.cheapestStore && (
                <p className="text-sm text-muted-foreground mt-2">
                  🏆 Supermercado mais econômico no geral: <span className="text-foreground font-medium">{potentialSavings.cheapestStore}</span>
                </p>
              )}
              {potentialSavings.topVariations.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {potentialSavings.topVariations.map((v) => (
                    <Badge key={v.produto} variant="secondary" className="text-xs">
                      {v.produto}: ±R$ {v.diff.toFixed(2).replace(".", ",")}
                    </Badge>
                  ))}
                </div>
              )}
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Ranking */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-accent/10 p-2.5">
                    <Award className="h-5 w-5 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold">Ranking de Supermercados</h2>
                </div>
                {storeRanking.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <div className="space-y-3">
                    {storeRanking.map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between glass-card-inner p-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                            {i + 1}º
                          </span>
                          <div>
                            <p className="text-sm font-medium">{s.nome}</p>
                            <p className="text-xs text-muted-foreground">{s.purchases} produtos analisados</p>
                          </div>
                        </div>
                        <span className="text-sm font-mono">{formatCurrency(s.avgPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Sugestões */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-primary/10 p-2.5">
                    <TrendingDown className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">Sugestões para Economizar</h2>
                </div>
                {suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Compre o mesmo produto em diferentes supermercados para receber sugestões.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.slice(0, 5).map((s, i) => (
                      <div key={i} className="glass-card-inner p-3">
                        <p className="text-sm text-foreground">{s.msg}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Comparação por produto */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-accent/10 p-2.5">
                  <ShoppingCart className="h-5 w-5 text-accent" />
                </div>
                <h2 className="text-lg font-semibold">Comparação por Produto</h2>
              </div>
              {productComparison.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Produto</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Supermercado</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Preço médio</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Compras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productComparison.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
                          <td className="py-2 px-3 font-medium">{row.produto}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.supermercado}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.precoMedio)}</td>
                          <td className="py-2 px-3 text-right text-muted-foreground">{row.compras}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

function formatMoney(val: number) {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

export default EconomiaSuperPage;
