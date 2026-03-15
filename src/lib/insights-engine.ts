// Insights engine for supermarket price analysis

export interface Insight {
  tipo: "produto_mais_barato" | "variacao_preco" | "supermercado_economico" | "maior_economia" | "economia_mensal";
  mensagem: string;
  impacto_estimado: number;
  icone?: string;
}

interface EnrichedItem {
  nome_normalizado: string;
  preco_unitario: number;
  preco_total: number;
  quantidade: number;
  store_id: string;
  store_nome: string;
}

interface StoreAvg {
  nome: string;
  avg: number;
  count: number;
  totalSpent: number;
}

function fmt(val: number) {
  return `R$ ${val.toFixed(2).replace(".", ",")}`;
}

/** Build per-product per-store aggregation */
function buildProductStoreMap(items: EnrichedItem[]) {
  const map = new Map<string, Map<string, { totalUnit: number; totalPrice: number; count: number; nome: string }>>();
  for (const item of items) {
    if (!map.has(item.nome_normalizado)) map.set(item.nome_normalizado, new Map());
    const sm = map.get(item.nome_normalizado)!;
    const e = sm.get(item.store_id) || { totalUnit: 0, totalPrice: 0, count: 0, nome: item.store_nome };
    e.totalUnit += item.preco_unitario;
    e.totalPrice += item.preco_total;
    e.count += 1;
    sm.set(item.store_id, e);
  }
  return map;
}

/** Build per-store aggregation */
function buildStoreMap(items: EnrichedItem[]) {
  const map = new Map<string, { totalUnit: number; count: number; nome: string }>();
  for (const item of items) {
    const e = map.get(item.store_id) || { totalUnit: 0, count: 0, nome: item.store_nome };
    e.totalUnit += item.preco_unitario;
    e.count += 1;
    map.set(item.store_id, e);
  }
  return map;
}

export function generateInsights(items: EnrichedItem[], periodDays: number): Insight[] {
  if (!items.length) return [];

  const prodStoreMap = buildProductStoreMap(items);
  const storeMap = buildStoreMap(items);
  const months = Math.max(periodDays / 30, 1);
  const allInsights: Insight[] = [];

  // --- Type 1: Produto mais barato em outro supermercado ---
  prodStoreMap.forEach((stores, produto) => {
    if (stores.size < 2) return;
    const entries = [...stores.values()].map((v) => ({
      nome: v.nome,
      avg: v.totalUnit / v.count,
      count: v.count,
    }));
    entries.sort((a, b) => a.avg - b.avg);
    const cheapest = entries[0];
    const mostExpensive = entries[entries.length - 1];
    const diff = mostExpensive.avg - cheapest.avg;
    const pct = Math.round((diff / mostExpensive.avg) * 100);
    if (pct >= 5) {
      allInsights.push({
        tipo: "produto_mais_barato",
        mensagem: `${produto} costuma ser ${pct}% mais barato no ${cheapest.nome}. Você paga em média ${fmt(mostExpensive.avg)} no ${mostExpensive.nome}, mas encontra por ${fmt(cheapest.avg)} no ${cheapest.nome}.`,
        impacto_estimado: diff * mostExpensive.count,
        icone: "💰",
      });
    }
  });

  // --- Type 2: Produto com maior variação de preço ---
  prodStoreMap.forEach((stores, produto) => {
    if (stores.size < 2) return;
    const prices = [...stores.values()].map((v) => v.totalUnit / v.count);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const variacao = Math.round(((max - min) / min) * 100);
    if (variacao >= 15) {
      allInsights.push({
        tipo: "variacao_preco",
        mensagem: `O preço de ${produto} varia até ${variacao}% entre os supermercados onde você compra (de ${fmt(min)} a ${fmt(max)}).`,
        impacto_estimado: max - min,
        icone: "📊",
      });
    }
  });

  // --- Type 3: Supermercado mais econômico ---
  if (storeMap.size >= 2) {
    const storeAvgs: StoreAvg[] = [...storeMap.entries()].map(([, v]) => ({
      nome: v.nome,
      avg: v.totalUnit / v.count,
      count: v.count,
      totalSpent: v.totalUnit,
    }));
    storeAvgs.sort((a, b) => a.avg - b.avg);
    const cheapest = storeAvgs[0];
    const othersAvg =
      storeAvgs.slice(1).reduce((s, v) => s + v.avg, 0) / (storeAvgs.length - 1);
    const pctCheaper = Math.round(((othersAvg - cheapest.avg) / othersAvg) * 100);
    if (pctCheaper >= 3) {
      const periodLabel =
        months <= 1 ? "no último mês" : `nos últimos ${Math.round(months)} meses`;
      allInsights.push({
        tipo: "supermercado_economico",
        mensagem: `${periodLabel}, o ${cheapest.nome} foi em média ${pctCheaper}% mais barato que os outros supermercados.`,
        impacto_estimado: (othersAvg - cheapest.avg) * cheapest.count,
        icone: "🏆",
      });
    }
  }

  // --- Type 4: Produtos com maior potencial de economia (grouped) ---
  const topProducts: { produto: string; economia: number; loja: string }[] = [];
  prodStoreMap.forEach((stores, produto) => {
    if (stores.size < 2) return;
    const entries = [...stores.values()];
    const avgPrices = entries.map((e) => ({ avg: e.totalUnit / e.count, nome: e.nome, count: e.count }));
    avgPrices.sort((a, b) => a.avg - b.avg);
    const cheapest = avgPrices[0];
    let totalSaved = 0;
    for (const e of avgPrices.slice(1)) {
      totalSaved += (e.avg - cheapest.avg) * e.count;
    }
    if (totalSaved > 0) {
      topProducts.push({ produto, economia: totalSaved, loja: cheapest.nome });
    }
  });
  topProducts.sort((a, b) => b.economia - a.economia);

  if (topProducts.length >= 2) {
    const top = topProducts.slice(0, 3);
    const totalEconomia = top.reduce((s, p) => s + p.economia, 0);
    const nomes = top.map((p) => p.produto).join(", ");
    const lojaFreq = new Map<string, number>();
    top.forEach((p) => lojaFreq.set(p.loja, (lojaFreq.get(p.loja) || 0) + 1));
    const bestStore = [...lojaFreq.entries()].sort((a, b) => b[1] - a[1])[0][0];

    allInsights.push({
      tipo: "maior_economia",
      mensagem: `Você poderia economizar ${fmt(totalEconomia / months)}/mês comprando ${nomes} no ${bestStore}.`,
      impacto_estimado: totalEconomia / months,
      icone: "🛒",
    });
  }

  // --- Type 5: Economia potencial mensal total ---
  let totalPotential = 0;
  prodStoreMap.forEach((stores) => {
    const entries = [...stores.values()];
    const avgPrices = entries.map((e) => e.totalPrice / e.count);
    const minAvg = Math.min(...avgPrices);
    for (const e of entries) {
      totalPotential += (e.totalPrice / e.count - minAvg) * e.count;
    }
  });

  if (totalPotential > 0) {
    const monthly = totalPotential / months;
    allInsights.push({
      tipo: "economia_mensal",
      mensagem: `Com base no seu histórico, você poderia economizar cerca de ${fmt(monthly)} por mês comprando cada produto no supermercado mais barato.`,
      impacto_estimado: monthly,
      icone: "📈",
    });
  }

  // Sort by impact, deduplicate types, limit to 5
  allInsights.sort((a, b) => b.impacto_estimado - a.impacto_estimado);

  // Ensure diversity: at most 2 of the same type
  const typeCounts = new Map<string, number>();
  const diverse: Insight[] = [];
  for (const insight of allInsights) {
    const count = typeCounts.get(insight.tipo) || 0;
    if (count < 2) {
      diverse.push(insight);
      typeCounts.set(insight.tipo, count + 1);
    }
    if (diverse.length >= 5) break;
  }

  return diverse;
}
