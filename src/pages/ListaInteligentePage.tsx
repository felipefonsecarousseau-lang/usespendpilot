import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ShoppingCart, TrendingDown, Store, Search, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import PremiumGate from "@/components/PremiumGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ListItem {
  id: string;
  nome: string;
  quantidade: number;
}

interface PriceInfo {
  store_nome: string;
  store_id: string;
  avg_price: number;
  count: number;
}

interface ProductAnalysis {
  nome: string;
  quantidade: number;
  prices: PriceInfo[];
  bestStore: PriceInfo | null;
  userAvg: number | null;
  savings: number;
  hasHistory: boolean;
}

const fmt = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

const ListaInteligentePage = () => {
  const [items, setItems] = useState<ListItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputQty, setInputQty] = useState(1);
  const [generating, setGenerating] = useState(false);

  const addItem = () => {
    const nome = inputValue.trim();
    if (!nome) return;
    // Normalize: capitalize first letter, lowercase rest
    const normalizado = nome
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
    if (items.some((i) => i.nome.toLowerCase() === normalizado.toLowerCase())) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nome: normalizado, quantidade: inputQty },
    ]);
    setInputValue("");
    setInputQty(1);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Fetch all user's receipt_items + stores for price lookup
  const { data: historyData } = useQuery({
    queryKey: ["smart-list-history"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: receipts, error: rErr } = await supabase
        .from("receipts")
        .select("id, store_id, data_compra")
        .eq("user_id", user.id);
      if (rErr) throw rErr;
      if (!receipts?.length) return { items: [], stores: [], receiptStoreMap: {}, receipts: [] };

      const receiptIds = receipts.map((r) => r.id);
      const storeIds = [...new Set(receipts.map((r) => r.store_id))];

      const [itemsRes, storesRes] = await Promise.all([
        supabase
          .from("receipt_items")
          .select("receipt_id, nome_normalizado, preco_unitario")
          .in("receipt_id", receiptIds),
        supabase.from("stores").select("id, nome").in("id", storeIds),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (storesRes.error) throw storesRes.error;

      const receiptStoreMap: Record<string, string> = {};
      receipts.forEach((r) => (receiptStoreMap[r.id] = r.store_id));

      return {
        items: itemsRes.data || [],
        stores: storesRes.data || [],
        receiptStoreMap,
        receipts,
      };
    },
  });

  // Known product names for autocomplete hints
  const knownProducts = useMemo(() => {
    if (!historyData?.items) return [];
    const set = new Set<string>();
    historyData.items.forEach((i) => set.add(i.nome_normalizado));
    return [...set].sort();
  }, [historyData?.items]);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim() || inputValue.length < 2) return [];
    const lower = inputValue.toLowerCase();
    return knownProducts
      .filter(
        (p) =>
          p.toLowerCase().includes(lower) &&
          !items.some((i) => i.nome.toLowerCase() === p.toLowerCase())
      )
      .slice(0, 5);
  }, [inputValue, knownProducts, items]);

  // Generate list from recent purchases
  const generateFromHistory = () => {
    if (!historyData?.items?.length || !historyData.receipts) return;
    setGenerating(true);

    // Get receipts from last 60 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const recentReceiptIds = new Set(
      historyData.receipts
        .filter((r) => r.data_compra >= cutoffStr)
        .map((r) => r.id)
    );

    // Find the most recent receipt
    const sortedReceipts = [...historyData.receipts].sort(
      (a, b) => b.data_compra.localeCompare(a.data_compra)
    );
    const lastReceiptId = sortedReceipts[0]?.id;
    const lastReceiptItems = new Set(
      historyData.items
        .filter((i) => i.receipt_id === lastReceiptId)
        .map((i) => i.nome_normalizado)
    );

    // Count frequency in last 60 days
    const freq = new Map<string, number>();
    historyData.items.forEach((item) => {
      if (!recentReceiptIds.has(item.receipt_id)) return;
      freq.set(item.nome_normalizado, (freq.get(item.nome_normalizado) || 0) + 1);
    });

    // Select recurring products (freq >= 2 OR in last receipt)
    const candidates = new Map<string, number>();
    freq.forEach((count, nome) => {
      if (count >= 2 || lastReceiptItems.has(nome)) {
        candidates.set(nome, count);
      }
    });

    // Also add last receipt items not yet counted
    lastReceiptItems.forEach((nome) => {
      if (!candidates.has(nome)) candidates.set(nome, 1);
    });

    // Sort by frequency, limit to 12
    const sorted = [...candidates.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    const newItems: ListItem[] = sorted
      .filter(([nome]) => !items.some((i) => i.nome.toLowerCase() === nome.toLowerCase()))
      .map(([nome]) => ({
        id: crypto.randomUUID(),
        nome,
        quantidade: 1,
      }));

    setTimeout(() => {
      setItems((prev) => [...prev, ...newItems]);
      setGenerating(false);
    }, 400);
  };

  const analysis: ProductAnalysis[] = useMemo(() => {
    if (!historyData || !items.length) return [];

    const storesMap = new Map<string, string>();
    historyData.stores.forEach((s) => storesMap.set(s.id, s.nome));

    return items.map((listItem) => {
      const lower = listItem.nome.toLowerCase();
      // Find matching history items
      const matches = historyData.items.filter(
        (hi) => hi.nome_normalizado.toLowerCase() === lower
      );

      if (!matches.length) {
        return {
          nome: listItem.nome,
          quantidade: listItem.quantidade,
          prices: [],
          bestStore: null,
          userAvg: null,
          savings: 0,
          hasHistory: false,
        };
      }

      // Group by store
      const storeGroups = new Map<
        string,
        { total: number; count: number; store_nome: string }
      >();
      matches.forEach((m) => {
        const storeId = historyData.receiptStoreMap[m.receipt_id];
        if (!storeId) return;
        const e = storeGroups.get(storeId) || {
          total: 0,
          count: 0,
          store_nome: storesMap.get(storeId) || "Desconhecido",
        };
        e.total += m.preco_unitario;
        e.count += 1;
        storeGroups.set(storeId, e);
      });

      const prices: PriceInfo[] = [...storeGroups.entries()]
        .map(([store_id, v]) => ({
          store_id,
          store_nome: v.store_nome,
          avg_price: v.total / v.count,
          count: v.count,
        }))
        .sort((a, b) => a.avg_price - b.avg_price);

      const bestStore = prices[0] || null;
      const overallAvg =
        matches.reduce((s, m) => s + m.preco_unitario, 0) / matches.length;
      const savings = bestStore
        ? (overallAvg - bestStore.avg_price) * listItem.quantidade
        : 0;

      return {
        nome: listItem.nome,
        quantidade: listItem.quantidade,
        prices,
        bestStore,
        userAvg: overallAvg,
        savings: Math.max(0, savings),
        hasHistory: true,
      };
    });
  }, [items, historyData]);

  // Summary calculations
  const totalSavings = useMemo(
    () => analysis.reduce((s, a) => s + a.savings, 0),
    [analysis]
  );

  const bestOverallStore = useMemo(() => {
    if (!analysis.length) return null;
    const withHistory = analysis.filter((a) => a.hasHistory && a.bestStore);
    if (!withHistory.length) return null;

    // Score each store by how many items it's cheapest for
    const storeScores = new Map<
      string,
      { nome: string; totalCost: number; itemCount: number }
    >();
    withHistory.forEach((a) => {
      a.prices.forEach((p) => {
        const e = storeScores.get(p.store_id) || {
          nome: p.store_nome,
          totalCost: 0,
          itemCount: 0,
        };
        e.totalCost += p.avg_price * a.quantidade;
        e.itemCount += 1;
        storeScores.set(p.store_id, e);
      });
    });

    // Find store with most items available and lowest total cost
    const scored = [...storeScores.entries()]
      .filter(([, v]) => v.itemCount >= withHistory.length * 0.5) // at least half the items
      .sort((a, b) => a[1].totalCost - b[1].totalCost);

    if (!scored.length) return null;

    const best = scored[0][1];
    const worst = scored[scored.length - 1]?.[1];
    const pctCheaper =
      worst && worst.totalCost > best.totalCost
        ? Math.round(
            ((worst.totalCost - best.totalCost) / worst.totalCost) * 100
          )
        : 0;

    return { nome: best.nome, totalCost: best.totalCost, pctCheaper };
  }, [analysis]);

  return (
    <AppLayout>
      <PremiumGate>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Lista Inteligente de Compras
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monte sua lista e descubra onde comprar mais barato.
          </p>
        </div>

        {/* Add items section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-full bg-primary/10 p-2.5">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Montar Lista</h2>
          </div>

          <div className="flex gap-2 relative">
            <div className="flex-1 relative">
              <Input
                placeholder="Nome do produto (ex: Arroz 5kg)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                className="bg-secondary border-border"
              />
              {/* Autocomplete dropdown */}
              {filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInputValue(s);
                        setTimeout(() => {
                          setInputValue("");
                          setItems((prev) => [
                            ...prev,
                            {
                              id: crypto.randomUUID(),
                              nome: s,
                              quantidade: inputQty,
                            },
                          ]);
                        }, 0);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface-hover transition-colors flex items-center gap-2"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input
              type="number"
              min={1}
              value={inputQty}
              onChange={(e) => setInputQty(Math.max(1, Number(e.target.value)))}
              className="w-20 bg-secondary border-border"
              placeholder="Qtd"
            />
            <Button onClick={addItem} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Generate from history button */}
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="outline"
              onClick={generateFromHistory}
              disabled={generating || !historyData?.receipts?.length}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Gerar lista baseada nas minhas últimas compras
            </Button>
            {!historyData?.receipts?.length && (
              <span className="text-xs text-muted-foreground">
                Envie notas fiscais primeiro
              </span>
            )}
          </div>

          {/* Item chips */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <Badge
                      variant="secondary"
                      className="text-sm py-1.5 px-3 gap-1.5 cursor-pointer hover:bg-destructive/20 transition-colors"
                      onClick={() => removeItem(item.id)}
                    >
                      {item.nome}
                      {item.quantidade > 1 && (
                        <span className="text-muted-foreground">
                          ×{item.quantidade}
                        </span>
                      )}
                      <X className="h-3 w-3 text-muted-foreground" />
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Results */}
        {items.length > 0 && analysis.length > 0 && (
          <>
            {/* Summary cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Economia Estimada
                  </span>
                </div>
                <p className="text-2xl font-bold text-primary currency-display">
                  {fmt(totalSavings)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  comprando cada item no supermercado mais barato
                </p>
              </motion.div>

              {bestOverallStore && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Melhor Supermercado
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{bestOverallStore.nome}</p>
                  {bestOverallStore.pctCheaper > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{bestOverallStore.pctCheaper}% mais barato no geral para
                      esta lista
                    </p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Product comparison table */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-accent/10 p-2.5">
                  <Lightbulb className="h-5 w-5 text-accent" />
                </div>
                <h2 className="text-lg font-semibold">
                  Recomendações por Produto
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Produto
                      </th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        Melhor Supermercado
                      </th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                        Preço Médio
                      </th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">
                        Economia
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.map((a) => (
                      <tr
                        key={a.nome}
                        className="border-b border-border/50 hover:bg-surface-hover transition-colors"
                      >
                        <td className="py-3 px-3">
                          <span className="font-medium">{a.nome}</span>
                          {a.quantidade > 1 && (
                            <span className="text-muted-foreground ml-1">
                              ×{a.quantidade}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {a.hasHistory ? (
                            <span className="text-foreground">
                              {a.bestStore?.store_nome}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">
                              Sem histórico
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          {a.hasHistory && a.bestStore
                            ? fmt(a.bestStore.avg_price)
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {a.savings > 0 ? (
                            <span className="text-primary currency-display font-medium">
                              {fmt(a.savings)}
                            </span>
                          ) : a.hasHistory ? (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Per-product price breakdown */}
            {analysis.some((a) => a.prices.length > 1) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6"
              >
                <h2 className="text-lg font-semibold mb-4">
                  Detalhamento por Supermercado
                </h2>
                <div className="space-y-4">
                  {analysis
                    .filter((a) => a.prices.length > 1)
                    .map((a) => (
                      <div key={a.nome} className="glass-card-inner p-4">
                        <p className="text-sm font-medium mb-2">{a.nome}</p>
                        <div className="space-y-1.5">
                          {a.prices.map((p, i) => (
                            <div
                              key={p.store_id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span
                                className={
                                  i === 0
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {i === 0 && "🏆 "}
                                {p.store_nome}
                              </span>
                              <span className="font-mono">
                                {fmt(p.avg_price)}
                                <span className="text-muted-foreground ml-2 text-xs">
                                  ({p.count}x)
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-12 flex flex-col items-center gap-4 text-center"
          >
            <div className="rounded-full bg-primary/10 p-4">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Monte sua lista de compras
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione produtos acima para descobrir onde comprar mais barato.
              </p>
            </div>
          </motion.div>
        )}
      </div>
      </PremiumGate>
    </AppLayout>
  );
};

export default ListaInteligentePage;
