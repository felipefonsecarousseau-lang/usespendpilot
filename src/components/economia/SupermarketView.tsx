import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingDown, Award, PiggyBank, Search, Scale, CheckCircle2, ShoppingBasket } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { generateInsights } from "@/lib/insights-engine";
import { normalizeProduct, formatPricePerUnit, type NormalizedProduct } from "@/lib/product-normalizer";

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

interface NormalizedEnrichedItem extends EnrichedItem {
  norm: NormalizedProduct;
}

interface Props {
  enrichedItems: EnrichedItem[];
  period: string;
}

const SupermarketView = ({ enrichedItems, period }: Props) => {
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // Normalize all items
  const normalizedItems = useMemo<NormalizedEnrichedItem[]>(() => {
    return enrichedItems.map((item) => ({
      ...item,
      norm: normalizeProduct(item.nome_normalizado, item.quantidade, item.preco_total),
    }));
  }, [enrichedItems]);

  // Group products by normalized base name for the selector
  const productGroups = useMemo(() => {
    const map = new Map<string, { baseName: string; baseNameClean: string; count: number }>();
    normalizedItems.forEach((item) => {
      const key = item.norm.baseNameClean;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { baseName: item.norm.baseName, baseNameClean: key, count: 1 });
      }
    });
    return [...map.values()].sort((a, b) => a.baseName.localeCompare(b.baseName));
  }, [normalizedItems]);

  // Product-level deep analysis using normalized data
  const productAnalysis = useMemo(() => {
    if (selectedProduct === "all") return null;

    const items = normalizedItems.filter(
      (i) => i.norm.baseNameClean === selectedProduct
    );
    if (items.length === 0) return null;

    // Check if we have unit pricing available
    const hasUnitPricing = items.some((i) => i.norm.pricePerUnit !== null);
    const commonUnit = items.find((i) => i.norm.unit)?.norm.unit || null;

    // Group by store
    const storeMap = new Map<string, {
      prices: number[];
      unitPrices: number[];
      normalizedPrices: (number | null)[];
      quantities: number[];
      nome: string;
    }>();

    for (const item of items) {
      const e = storeMap.get(item.store_id) || {
        prices: [], unitPrices: [], normalizedPrices: [], quantities: [], nome: item.store_nome,
      };
      e.prices.push(item.preco_total);
      e.unitPrices.push(item.preco_unitario);
      e.normalizedPrices.push(item.norm.pricePerUnit);
      e.quantities.push(item.quantidade);
      storeMap.set(item.store_id, e);
    }

    const stores = [...storeMap.entries()].map(([id, v]) => {
      const avgUnit = v.unitPrices.reduce((s, p) => s + p, 0) / v.unitPrices.length;
      const avgTotal = v.prices.reduce((s, p) => s + p, 0) / v.prices.length;
      const avgQty = v.quantities.reduce((s, q) => s + q, 0) / v.quantities.length;
      const minUnit = Math.min(...v.unitPrices);
      const maxUnit = Math.max(...v.unitPrices);

      // Normalized price per unit (e.g. R$/kg)
      const validNorm = v.normalizedPrices.filter((p): p is number => p !== null);
      const avgNormPrice = validNorm.length > 0
        ? validNorm.reduce((s, p) => s + p, 0) / validNorm.length
        : null;

      return {
        id, nome: v.nome, avgUnit, avgTotal, avgQty, minUnit, maxUnit,
        compras: v.prices.length, avgNormPrice,
      };
    }).sort((a, b) => {
      // Sort by normalized price if available, else by unit price
      if (a.avgNormPrice !== null && b.avgNormPrice !== null) {
        return a.avgNormPrice - b.avgNormPrice;
      }
      return a.avgUnit - b.avgUnit;
    });

    // Price history (chronological)
    const history = items
      .filter((i) => i.data_compra)
      .sort((a, b) => (a.data_compra || "").localeCompare(b.data_compra || ""))
      .map((i) => ({
        data: i.data_compra || "",
        preco: i.preco_unitario,
        normPreco: i.norm.pricePerUnit,
        loja: i.store_nome,
        quantidade: i.quantidade,
        peso: i.norm.quantity,
        unidade: i.norm.unit,
      }));

    const cheapest = stores[0];
    const mostExpensive = stores[stores.length - 1];

    // Calculate savings using normalized prices when available
    let savings = 0;
    if (stores.length > 1) {
      if (cheapest.avgNormPrice !== null && mostExpensive.avgNormPrice !== null) {
        savings = mostExpensive.avgNormPrice - cheapest.avgNormPrice;
      } else {
        savings = mostExpensive.avgUnit - cheapest.avgUnit;
      }
    }

    return {
      stores, history, savings, cheapest, mostExpensive,
      totalCompras: items.length,
      hasUnitPricing, commonUnit,
    };
  }, [normalizedItems, selectedProduct]);

  // General insights (when no product selected)
  const insights = useMemo(() => {
    if (selectedProduct !== "all") return [];
    return generateInsights(enrichedItems, Number(period));
  }, [enrichedItems, period, selectedProduct]);

  // Comparativo por tipo de produto: mostra o mais barato de cada tipo
  const productTypeComparison = useMemo(() => {
    // Agrupa por baseNameClean, calcula preço/unidade normalizado
    const typeMap = new Map<string, {
      baseName: string;
      purchases: Array<{ pricePerUnit: number; store: string; date: string }>;
    }>();

    for (const item of normalizedItems) {
      const key = item.norm.baseNameClean;
      if (!key) continue;

      // Preço por unidade: usa pricePerUnit normalizado ou preco_unitario
      const unitPrice = item.norm.pricePerUnit ?? item.preco_unitario;
      if (!unitPrice || unitPrice <= 0) continue;

      const entry = typeMap.get(key) ?? { baseName: item.norm.baseName, purchases: [] };
      entry.purchases.push({
        pricePerUnit: unitPrice,
        store: item.store_nome,
        date: item.data_compra || "",
      });
      typeMap.set(key, entry);
    }

    // Só mostra tipos com pelo menos 1 compra, ordenado pelo preço mais barato encontrado
    return [...typeMap.entries()]
      .map(([key, v]) => {
        const sorted = [...v.purchases].sort((a, b) => a.pricePerUnit - b.pricePerUnit);
        const cheapest = sorted[0];
        const mostExpensive = sorted[sorted.length - 1];
        const unit = normalizedItems.find((i) => i.norm.baseNameClean === key)?.norm.unit || null;
        const hasPriceRange = sorted.length > 1 && mostExpensive.pricePerUnit > cheapest.pricePerUnit * 1.05;
        return {
          key,
          baseName: v.baseName,
          cheapestPrice: cheapest.pricePerUnit,
          cheapestStore: cheapest.store,
          mostExpensivePrice: mostExpensive.pricePerUnit,
          savings: hasPriceRange ? mostExpensive.pricePerUnit - cheapest.pricePerUnit : 0,
          unit,
          totalPurchases: v.purchases.length,
          hasPriceRange,
        };
      })
      .filter((t) => t.totalPurchases >= 1)
      .sort((a, b) => b.savings - a.savings || a.baseName.localeCompare(b.baseName));
  }, [normalizedItems]);

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
    // Use normalized base names for grouping
    const prodStoreBuild = new Map<string, Map<string, { totalPrice: number; count: number }>>();
    normalizedItems.forEach((item) => {
      const key = item.norm.baseNameClean;
      if (!prodStoreBuild.has(key)) prodStoreBuild.set(key, new Map());
      const sm = prodStoreBuild.get(key)!;
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
  }, [normalizedItems]);

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
            {productGroups.map((p) => (
              <SelectItem key={p.baseNameClean} value={p.baseNameClean}>
                {p.baseName} ({p.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Product deep analysis */}
      {productAnalysis && (
        <div className="space-y-4">
          {/* Unit pricing badge */}
          {productAnalysis.hasUnitPricing && productAnalysis.commonUnit && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Scale className="h-3 w-3" />
                Comparação por {productAnalysis.commonUnit}
              </Badge>
            </motion.div>
          )}

          {/* Store comparison */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-accent/10 p-2">
                <Award className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  {productGroups.find((p) => p.baseNameClean === selectedProduct)?.baseName || selectedProduct}
                </h2>
                <p className="text-xs text-muted-foreground">{productAnalysis.totalCompras} compras analisadas</p>
              </div>
            </div>

            {productAnalysis.savings > 0 && (
              <div className="glass-card-inner p-4 mb-4 flex items-center gap-3">
                <PiggyBank className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Economia de {productAnalysis.hasUnitPricing && productAnalysis.commonUnit
                      ? formatPricePerUnit(productAnalysis.savings, productAnalysis.commonUnit)
                      : fmtStr(productAnalysis.savings) + " por unidade"
                    }
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
                    {s.avgNormPrice !== null && productAnalysis.commonUnit ? (
                      <>
                        <p className="text-sm font-mono text-primary">
                          {formatPricePerUnit(s.avgNormPrice, productAnalysis.commonUnit)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(s.avgUnit)} unit.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-mono">{formatCurrency(s.avgUnit)}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.minUnit !== s.maxUnit ? `${fmtStr(s.minUnit)} – ${fmtStr(s.maxUnit)}` : "preço estável"}
                        </p>
                      </>
                    )}
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
                      {h.peso && h.unidade && (
                        <span className="text-xs text-muted-foreground/70">{h.peso}{h.unidade}</span>
                      )}
                    </div>
                    <div className="text-right">
                      {h.normPreco !== null && productAnalysis.commonUnit ? (
                        <span className="font-mono text-sm text-primary">
                          {formatPricePerUnit(h.normPreco, productAnalysis.commonUnit)}
                        </span>
                      ) : (
                        <span className="font-mono text-sm">{formatCurrency(h.preco)}</span>
                      )}
                    </div>
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

          {/* Comparativo por tipo de produto */}
          {productTypeComparison.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <ShoppingBasket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Comparativo por Produto</h2>
                  <p className="text-xs text-muted-foreground">Menor preço encontrado para cada tipo</p>
                </div>
              </div>
              <div className="space-y-2">
                {productTypeComparison.slice(0, 12).map((t) => (
                  <div key={t.key} className="glass-card-inner p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.baseName}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.cheapestStore}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono text-primary font-semibold">
                        {t.unit ? formatPricePerUnit(t.cheapestPrice, t.unit) : fmtStr(t.cheapestPrice)}
                      </p>
                      {t.hasPriceRange && (
                        <p className="text-[10px] text-muted-foreground">
                          economia de {t.unit ? formatPricePerUnit(t.savings, t.unit) : fmtStr(t.savings)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {productTypeComparison.length > 12 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  +{productTypeComparison.length - 12} produtos • selecione um produto acima para ver detalhes
                </p>
              )}
            </motion.div>
          )}

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
