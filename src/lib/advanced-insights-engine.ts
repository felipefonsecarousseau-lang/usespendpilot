// Advanced financial intelligence engine — generates actionable, prioritized insights

export type InsightLevel = "alto" | "medio" | "baixo";

export type InsightType =
  | "produto_acima_media"
  | "melhor_supermercado_produto"
  | "economia_potencial_acumulada"
  | "tendencia_aumento"
  | "estouro_meta"
  | "projecao_mensal"
  | "ranking_supermercados"
  | "perda_financeira"
  | "dados_insuficientes";

export interface AdvancedInsight {
  id: string;
  tipo: InsightType;
  titulo: string;
  descricao: string;
  impacto_valor: number;
  impacto_percentual?: number;
  categoria?: string;
  acao_sugerida?: string;
  nivel: InsightLevel;
}

// ─── Input types ───

export interface ReceiptItemInput {
  nome_normalizado: string;
  preco_unitario: number;
  preco_total: number;
  quantidade: number;
  categoria: string;
  receipt_id: string;
}

export interface ReceiptInput {
  id: string;
  data_compra: string;
  valor_total: number;
  store_id: string;
}

export interface StoreInput {
  id: string;
  nome: string;
}

export interface ManualExpenseInput {
  valor: number;
  data: string;
  categoria: string;
}

export interface FixedOccurrenceInput {
  valor: number;
  status: string;
}

export interface AdvancedInsightsInput {
  receipts: ReceiptInput[];
  receiptItems: ReceiptItemInput[];
  stores: StoreInput[];
  manualExpenses: ManualExpenseInput[];
  fixedOccurrences: FixedOccurrenceInput[];
  rendaMensal: number;
  metaMensal: number | null;
  currentMonthStart: string; // YYYY-MM-DD
}

// ─── Helpers ───

function fmt(val: number): string {
  return `R$ ${val.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function fmtPct(val: number): string {
  return `${Math.round(val)}%`;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Main engine ───

export function getAdvancedInsights(input: AdvancedInsightsInput): AdvancedInsight[] {
  const {
    receipts,
    receiptItems,
    stores,
    manualExpenses,
    fixedOccurrences,
    rendaMensal,
    metaMensal,
    currentMonthStart,
  } = input;

  // If very little data, return encouragement
  if (receiptItems.length < 3 && manualExpenses.length < 3) {
    return [{
      id: uid(),
      tipo: "dados_insuficientes",
      titulo: "Continue registrando",
      descricao: `Com mais ${Math.max(0, 5 - receiptItems.length - manualExpenses.length)} lançamentos, suas recomendações ficarão mais precisas.`,
      impacto_valor: 0,
      nivel: "baixo",
    }];
  }

  const storeMap = new Map<string, string>();
  for (const s of stores) storeMap.set(s.id, s.nome);

  // receipt → store mapping
  const receiptStoreMap = new Map<string, string>();
  for (const r of receipts) receiptStoreMap.set(r.id, r.store_id);

  const now = new Date();
  const currentMK = monthKey(currentMonthStart);
  const today = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const diasRestantes = totalDays - today;

  // Enrich items with store info
  const enriched = receiptItems.map((item) => {
    const storeId = receiptStoreMap.get(item.receipt_id) || "";
    return { ...item, store_id: storeId, store_nome: storeMap.get(storeId) || "Desconhecido" };
  });

  // Current month receipts
  const currentReceipts = receipts.filter((r) => monthKey(r.data_compra) === currentMK);
  const currentReceiptIds = new Set(currentReceipts.map((r) => r.id));
  const currentItems = enriched.filter((i) => currentReceiptIds.has(i.receipt_id));

  // All-time items (for historical comparison)
  const historicalItems = enriched.filter((i) => !currentReceiptIds.has(i.receipt_id));

  // Product-level aggregation (historical)
  const productHistory = new Map<string, { totalUnit: number; count: number; minUnit: number }>();
  for (const item of historicalItems) {
    const pu = Number(item.preco_unitario) || 0;
    if (pu <= 0) continue;
    const e = productHistory.get(item.nome_normalizado) || { totalUnit: 0, count: 0, minUnit: Infinity };
    e.totalUnit += pu;
    e.count += 1;
    e.minUnit = Math.min(e.minUnit, pu);
    productHistory.set(item.nome_normalizado, e);
  }

  // Product per store (all time)
  const productStoreAll = new Map<string, Map<string, { totalUnit: number; count: number; nome: string }>>();
  for (const item of enriched) {
    const pu = Number(item.preco_unitario) || 0;
    if (pu <= 0) continue;
    if (!productStoreAll.has(item.nome_normalizado)) productStoreAll.set(item.nome_normalizado, new Map());
    const sm = productStoreAll.get(item.nome_normalizado)!;
    const e = sm.get(item.store_id) || { totalUnit: 0, count: 0, nome: item.store_nome };
    e.totalUnit += pu;
    e.count += 1;
    sm.set(item.store_id, e);
  }

  const allInsights: AdvancedInsight[] = [];

  // ── 1. Produto mais caro que histórico ──
  for (const item of currentItems) {
    const pu = Number(item.preco_unitario) || 0;
    if (pu <= 0) continue;
    const hist = productHistory.get(item.nome_normalizado);
    if (!hist || hist.count < 2) continue;
    const avg = hist.totalUnit / hist.count;
    const diff = pu - avg;
    const pct = (diff / avg) * 100;
    if (pct >= 15 && diff >= 1) {
      allInsights.push({
        id: uid(),
        tipo: "produto_acima_media",
        titulo: `${item.nome_normalizado} acima da média`,
        descricao: `Você pagou ${fmt(pu)}, mas sua média é ${fmt(avg)} (${fmtPct(pct)} a mais).`,
        impacto_valor: Math.round(diff * (item.quantidade || 1) * 100) / 100,
        impacto_percentual: Math.round(pct),
        categoria: item.categoria,
        acao_sugerida: `Compare preços antes de comprar ${item.nome_normalizado}.`,
        nivel: pct >= 30 ? "alto" : "medio",
      });
    }
  }

  // ── 2. Melhor supermercado por produto ──
  productStoreAll.forEach((storeEntries, produto) => {
    if (storeEntries.size < 2) return;
    const entries = [...storeEntries.values()].map((v) => ({
      nome: v.nome,
      avg: v.totalUnit / v.count,
      count: v.count,
    }));
    entries.sort((a, b) => a.avg - b.avg);
    const cheapest = entries[0];
    const mostExpensive = entries[entries.length - 1];
    const diff = mostExpensive.avg - cheapest.avg;
    const pct = (diff / mostExpensive.avg) * 100;
    if (pct >= 10 && diff >= 0.5) {
      allInsights.push({
        id: uid(),
        tipo: "melhor_supermercado_produto",
        titulo: `${produto} mais barato`,
        descricao: `${produto} está ${fmtPct(pct)} mais barato no ${cheapest.nome} (${fmt(cheapest.avg)} vs ${fmt(mostExpensive.avg)}).`,
        impacto_valor: Math.round(diff * mostExpensive.count * 100) / 100,
        impacto_percentual: Math.round(pct),
        acao_sugerida: `Compre ${produto} no ${cheapest.nome}.`,
        nivel: pct >= 25 ? "alto" : "medio",
      });
    }
  });

  // ── 3. Economia potencial acumulada ──
  let totalPotentialSavings = 0;
  for (const item of currentItems) {
    const pu = Number(item.preco_unitario) || 0;
    if (pu <= 0) continue;
    const hist = productHistory.get(item.nome_normalizado);
    if (!hist || hist.minUnit >= pu) continue;
    totalPotentialSavings += (pu - hist.minUnit) * (item.quantidade || 1);
  }
  if (totalPotentialSavings >= 1) {
    allInsights.push({
      id: uid(),
      tipo: "economia_potencial_acumulada",
      titulo: "Economia possível este mês",
      descricao: `Você poderia ter economizado ${fmt(totalPotentialSavings)} comprando pelos menores preços do seu histórico.`,
      impacto_valor: Math.round(totalPotentialSavings * 100) / 100,
      acao_sugerida: "Compare preços antes de comprar os itens mais caros.",
      nivel: totalPotentialSavings >= 50 ? "alto" : "medio",
    });
  }

  // ── 4. Tendência de aumento de gastos ──
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMK = monthKey(prevMonthDate.toISOString());
  const prevReceipts = receipts.filter((r) => monthKey(r.data_compra) === prevMK);
  const prevTotal = prevReceipts.reduce((s, r) => s + Number(r.valor_total), 0);
  const currentReceiptTotal = currentReceipts.reduce((s, r) => s + Number(r.valor_total), 0);

  if (prevTotal > 0 && currentReceiptTotal > 0 && today > 5) {
    const projectedCurrent = (currentReceiptTotal / today) * totalDays;
    const variacao = ((projectedCurrent - prevTotal) / prevTotal) * 100;
    if (variacao > 10) {
      allInsights.push({
        id: uid(),
        tipo: "tendencia_aumento",
        titulo: "Gastos em tendência de alta",
        descricao: `Se continuar assim, você gastará ${fmtPct(variacao)} a mais que o mês passado (projeção: ${fmt(projectedCurrent)}).`,
        impacto_valor: Math.round((projectedCurrent - prevTotal) * 100) / 100,
        impacto_percentual: Math.round(variacao),
        acao_sugerida: "Revise suas compras dos próximos dias para controlar o ritmo.",
        nivel: variacao >= 30 ? "alto" : "medio",
      });
    }
  }

  // ── 5. Estouro de meta mensal ──
  if (metaMensal && metaMensal > 0) {
    // Total current month spending
    const manualCurrentMonth = manualExpenses
      .filter((e) => monthKey(e.data) === currentMK)
      .reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const fixedTotal = fixedOccurrences.reduce((s, o) => s + (Number(o.valor) || 0), 0);
    const totalAtual = currentReceiptTotal + manualCurrentMonth + fixedTotal;
    const pctMeta = (totalAtual / metaMensal) * 100;

    if (pctMeta >= 75) {
      allInsights.push({
        id: uid(),
        tipo: "estouro_meta",
        titulo: pctMeta >= 100 ? "Meta estourada!" : "Meta quase atingida",
        descricao: pctMeta >= 100
          ? `Você já ultrapassou sua meta de ${fmt(metaMensal)} em ${fmt(totalAtual - metaMensal)}.`
          : `Você já usou ${fmtPct(pctMeta)} da sua meta de ${fmt(metaMensal)} e ainda faltam ${diasRestantes} dias.`,
        impacto_valor: pctMeta >= 100 ? Math.round((totalAtual - metaMensal) * 100) / 100 : 0,
        impacto_percentual: Math.round(pctMeta),
        acao_sugerida: pctMeta >= 100 ? "Reduza gastos imediatamente." : "Controle os próximos dias para não estourar.",
        nivel: pctMeta >= 100 ? "alto" : "medio",
      });
    }
  }

  // ── 6. Projeção mensal ──
  if (currentReceiptTotal > 0 && today > 3) {
    const manualCurrentMonth = manualExpenses
      .filter((e) => monthKey(e.data) === currentMK)
      .reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const fixedTotal = fixedOccurrences.reduce((s, o) => s + (Number(o.valor) || 0), 0);
    const variableTotal = currentReceiptTotal + manualCurrentMonth;
    const dailyAvg = variableTotal / today;
    const projected = variableTotal + dailyAvg * diasRestantes + fixedTotal;

    if (rendaMensal > 0) {
      const saldo = rendaMensal - projected;
      allInsights.push({
        id: uid(),
        tipo: "projecao_mensal",
        titulo: saldo < 0 ? "Projeção de déficit" : "Projeção do mês",
        descricao: saldo < 0
          ? `No ritmo atual, você terá um déficit de ${fmt(Math.abs(saldo))} no final do mês.`
          : `No ritmo atual, você vai gastar ${fmt(projected)} e sobrarão ${fmt(saldo)}.`,
        impacto_valor: Math.round(Math.abs(saldo) * 100) / 100,
        acao_sugerida: saldo < 0 ? "Reduza gastos diários para equilibrar o mês." : undefined,
        nivel: saldo < 0 ? "alto" : "baixo",
      });
    }
  }

  // ── 7. Ranking de supermercados ──
  const storeAgg = new Map<string, { total: number; count: number; nome: string }>();
  for (const item of enriched) {
    const pu = Number(item.preco_unitario) || 0;
    if (pu <= 0) continue;
    const e = storeAgg.get(item.store_id) || { total: 0, count: 0, nome: item.store_nome };
    e.total += pu;
    e.count += 1;
    storeAgg.set(item.store_id, e);
  }
  if (storeAgg.size >= 2) {
    const ranked = [...storeAgg.values()]
      .map((v) => ({ nome: v.nome, avg: v.total / v.count }))
      .sort((a, b) => a.avg - b.avg);
    const cheapest = ranked[0];
    const expensive = ranked[ranked.length - 1];
    const pct = ((expensive.avg - cheapest.avg) / expensive.avg) * 100;
    if (pct >= 5) {
      allInsights.push({
        id: uid(),
        tipo: "ranking_supermercados",
        titulo: `${cheapest.nome} é mais em conta`,
        descricao: `${cheapest.nome} é ${fmtPct(pct)} mais barato que ${expensive.nome} na média dos produtos.`,
        impacto_valor: Math.round((expensive.avg - cheapest.avg) * cheapest.avg * 10) / 100,
        impacto_percentual: Math.round(pct),
        acao_sugerida: `Priorize compras no ${cheapest.nome}.`,
        nivel: pct >= 15 ? "alto" : "medio",
      });
    }
  }

  // ── 8. Perda financeira ──
  let totalLost = 0;
  let lostCount = 0;
  for (const item of currentItems) {
    const pu = Number(item.preco_unitario) || 0;
    if (pu <= 0) continue;
    const hist = productHistory.get(item.nome_normalizado);
    if (!hist || hist.minUnit >= pu) continue;
    totalLost += (pu - hist.minUnit) * (item.quantidade || 1);
    lostCount++;
  }
  if (totalLost >= 5 && lostCount >= 2) {
    allInsights.push({
      id: uid(),
      tipo: "perda_financeira",
      titulo: "Dinheiro perdido com preços altos",
      descricao: `Você pagou ${fmt(totalLost)} a mais em ${lostCount} produtos comparado aos menores preços já registrados.`,
      impacto_valor: Math.round(totalLost * 100) / 100,
      acao_sugerida: "Pesquise preços antes de comprar os itens mais caros da lista.",
      nivel: totalLost >= 30 ? "alto" : "medio",
    });
  }

  // ── Prioritize and limit ──
  // Sort: nivel alto first, then by impacto_valor desc
  const levelWeight: Record<InsightLevel, number> = { alto: 3, medio: 2, baixo: 1 };
  allInsights.sort((a, b) => {
    const lw = levelWeight[b.nivel] - levelWeight[a.nivel];
    if (lw !== 0) return lw;
    return b.impacto_valor - a.impacto_valor;
  });

  // Deduplicate: max 1 of each type, limit 5
  const typeSeen = new Set<string>();
  const result: AdvancedInsight[] = [];
  for (const ins of allInsights) {
    if (typeSeen.has(ins.tipo)) continue;
    typeSeen.add(ins.tipo);
    result.push(ins);
    if (result.length >= 5) break;
  }

  return result;
}
