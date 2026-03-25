import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, TrendingDown, Award, PiggyBank, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { generateInsights } from "@/lib/insights-engine";

const formatCurrency = (val: number) => (
  <span className="currency-display">R$ {val.toFixed(2).replace(".", ",")}</span>
);
const fmtStr = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

interface EnrichedItem {
  receipt_id: string;
  nome_produto: string;
  nome_normalizado: string;
  categoria: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  store_id: string;
  store_nome: string;
  data_compra?: string;
}

interface Props {
  enrichedItems: EnrichedItem[];
  period: string;
}

const SupermarketView = ({ enrichedItems, period }: Props) => {
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // Unique products
  const products = useMemo(() => {
    const set = new Set<string>();
    enrichedItems.forEach((i) => set.add(i.nome_normalizado));
    return [...set].sort();
  }, [enrichedItems]);

  // Product-level deep analysis
  const productAnalysis = useMemo(() => {
    if (selectedProduct === "all") return null;
    const items = enrichedItems.filter((i) => i.nome_normalizado === selectedProduct);
    if (items.length === 0) return null;

    // Group by store
    const storeMap = new Map<string, { prices: number[]; unitPrices: number[]; quantities: number[]; nome: string }>();
    for (const item of items) {
      const e = storeMap.get(item.store_id) || { prices: [], unitPrices: [], quantities: [], nome: item.store_nome };
      e.prices.push(item.preco_total);
      e.unitPrices.push(item.preco_unitario);
      e.quantities.push(item.quantidade);
      storeMap.set(item.store_id, e);
    }

    const stores = [...storeMap.entries()].map(([id, v]) => {
      const avgUnit = v.unitPrices.reduce((s, p) => s + p, 0) / v.unitPrices.length;
      const avgTotal = v.prices.reduce((s, p) => s + p, 0) / v.prices.length;
      const avgQty = v.quantities.reduce((s, q) => s + q, 0) / v.quantities.length;
      const minUnit = Math.min(...v.unitPrices);
      const maxUnit = Math.max(...v.unitPrices);
      return { id, nome: v.nome, avgUnit, avgTotal, avgQty, minUnit, maxUnit, compras: v.prices.length };
    }).sort((a, b) => a.avgUnit - b.avgUnit);

    // Price history (chronological)
    const history = items
      .filter((i) => i.data_compra)
      .sort((a, b) => (a.data_compra || "").localeCompare(b.data_compra || ""))
      .map((i) => ({
        data: i.data_compra || "",
        preco: i.preco_unitario,
        loja: i.store_nome,
        quantidade: i.quantidade,
      }));

    const allUnitPrices = items.map((i) => i.preco_unitario);
    const cheapest = stores[0];
    const mostExpensive = stores[stores.length - 1];
    const savings = stores.length > 1 ? mostExpensive.avgUnit - cheapest.avgUnit : 0;

    return { stores, history, savings, cheapest, mostExpensive, totalCompras: items.length, avgPrice: allUnitPrices.reduce((s, p) => s + p, 0) / allUnitPrices.length };
  }, [enrichedItems, selectedProduct]);

  // General insights (when no product selected)
  const insights = useMemo(() => {
    if (selectedProduct !== "all") return [];
    return generateInsights(enrichedItems, Number(period));
  }, [enrichedItems, period, selectedProduct]);

  // Store ranking
  const storeRanking = useMemo(() => {
    const map = new Map<string, { total: number; count: number; nome: string }>();
    enrichedItems.forEach((item) => {
      const e = map.get(item.store_id) || { total: 0, count: 0, nome: item.store_nome };
      e.total += item.preco_unitario;
      e.count += 1;
      map.set(item.store_id, e);
    });
    return [...map.entries()]
      .map(([id, v]) => ({ id, nome: v.nome, avgPrice: v.total / v.count, purchases: v.count }))
      .sort((a, b) => a.avgPrice - b.avgPrice);
  }, [enrichedItems]);

  // Potential savings
  const potentialSavings = useMemo(() => {
    const prodStoreBuild = new Map<string, Map<string, { totalPrice: number; count: number }>>();
    enrichedItems.forEach((item) => {
      if (!prodStoreBuild.has(item.nome_normalizado)) prodStoreBuild.set(item.nome_normalizado, new Map());
      const sm = prodStoreBuild.get(item.nome_normalizado)!;
      const e = sm.get(item.store_id) || { totalPrice: 0, count: 0 };
      e.totalPrice += item.preco_total;
      e.count += 1;
      sm.set(item.store_id, e);
    });

    let total = 0;
    prodStoreBuild.forEach((stores) => {
      const entries = [...stores.values()];
      const avgPrices = entries.map((e) => e.totalPrice / e.count);
      const minAvg = Math.min(...avgPrices);
      entries.forEach((e) => {
        total += (e.totalPrice / e.count - minAvg) * e.count;
      });
    });

    return total;
  }, [enrichedItems]);

  return (
    <div className="space-y-6">
      {/* Product selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold">Analisar Produto</h2>
        </div>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-full bg-card border-border">
            <SelectValue placeholder="Selecione um produto para análise detalhada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Visão geral (todos os produtos)</SelectItem>
            {products.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Product deep analysis */}
      {productAnalysis && (
        <div className="space-y-4">
          {/* Store comparison */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-accent/10 p-2">
                <Award className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{selectedProduct}</h2>
                <p className="text-xs text-muted-foreground">{productAnalysis.totalCompras} compras analisadas</p>
              </div>
            </div>

            {productAnalysis.savings > 0 && (
              <div className="glass-card-inner p-4 mb-4 flex items-center gap-3">
                <PiggyBank className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Economia de {fmtStr(productAnalysis.savings)} por unidade
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Comprando no <span className="text-primary font-medium">{productAnalysis.cheapest?.nome}</span> em vez do {productAnalysis.mostExpensive?.nome}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {productAnalysis.stores.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between glass-card-inner p-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {i + 1}º
                    </span>
                    <div>
                      <p className="text-sm font-medium">{s.nome}</p>
                      <p className="text-xs text-muted-foreground">{s.compras} compras • Qtd média: {s.avgQty.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">{formatCurrency(s.avgUnit)}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.minUnit !== s.maxUnit ? `${fmtStr(s.minUnit)} – ${fmtStr(s.maxUnit)}` : "preço estável"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Price history */}
          {productAnalysis.history.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-5">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Histórico de Preços</h3>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {productAnalysis.history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-20">
                        {new Date(h.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                      <span className="text-xs text-muted-foreground">{h.loja}</span>
                    </div>
                    <span className="font-mono text-sm">{formatCurrency(h.preco)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* General view (no product selected) */}
      {selectedProduct === "all" && (
        <div className="space-y-6">
          {/* Potential savings hero */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/10 p-2.5">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Economia Potencial</h2>
            </div>
            <p className="text-3xl font-bold text-primary currency-display mb-2">
              {fmtStr(potentialSavings)}
            </p>
            <p className="text-sm text-muted-foreground">
              Comprando sempre no supermercado mais barato para cada produto.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Ranking */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
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
                        <span className={`text-sm font-bold w-6 text-center ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>{i + 1}º</span>
                        <div>
                          <p className="text-sm font-medium">{s.nome}</p>
                          <p className="text-xs text-muted-foreground">{s.purchases} produtos</p>
                        </div>
                      </div>
                      <span className="text-sm font-mono">{formatCurrency(s.avgPrice)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Suggestions */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <TrendingDown className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">Sugestões</h2>
              </div>
              {insights.length === 0 ? (
                <p className="text-sm text-muted-foreground">Compre em diferentes supermercados para receber sugestões.</p>
              ) : (
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <div key={i} className="glass-card-inner p-3 flex gap-2">
                      <span className="text-base shrink-0">{insight.icone}</span>
                      <div>
                        <p className="text-sm text-foreground">{insight.mensagem}</p>
                        {insight.impacto_estimado > 0 && (
                          <p className="text-xs text-primary mt-1 currency-display">Impacto: {fmtStr(insight.impacto_estimado)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupermarketView;
