// Financial Advisor — generates personalized recommendations

import { generateForecast, type FinancialForecast } from "./financial-forecast";
import { calculateFinancialScore, type FinancialScore } from "./financial-score";

export type RecommendationType =
  | "economia_categoria"
  | "economia_supermercado"
  | "tendencia_aumento"
  | "melhoria_score"
  | "economia_mensal";

export interface Recommendation {
  tipo: RecommendationType;
  titulo: string;
  mensagem: string;
  impacto_estimado: number;
}

interface ReceiptRow {
  valor_total: number;
  data_compra: string;
  receipt_items: { categoria: string; preco_total: number; nome_normalizado: string; preco_unitario: number }[];
}

interface StoreReceiptRow extends ReceiptRow {
  store_id: string;
  stores?: { nome: string } | null;
}

interface ManualExpenseRow {
  valor: number;
  data: string;
  categoria: string;
}

const CAT_LABELS: Record<string, string> = {
  mercado: "Supermercado",
  higiene: "Higiene",
  limpeza: "Limpeza",
  bebidas: "Bebidas",
  padaria: "Padaria",
  hortifruti: "Hortifruti",
  transporte: "Transporte",
  lazer: "Lazer",
  streaming: "Streaming",
  outros: "Outros",
};

function fmt(val: number) {
  return `R$ ${val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

/**
 * Generate up to 5 personalized financial recommendations.
 * Now includes manual expenses in all calculations.
 */
export function generateRecommendations(
  receipts: StoreReceiptRow[],
  rendaMensal: number,
  fixedExpensesTotal = 0,
  manualExpenses: ManualExpenseRow[] = []
): Recommendation[] {
  if (receipts.length === 0 && manualExpenses.length === 0) return [];

  const now = new Date();
  const currentMonth = monthKey(now.toISOString());
  const today = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Build historical category averages (past months only) from ALL sources
  const catMonth: Record<string, Record<string, number>> = {};
  const monthSet = new Set<string>();

  for (const r of receipts) {
    const mk = monthKey(r.data_compra);
    monthSet.add(mk);
    for (const item of r.receipt_items ?? []) {
      const cat = item.categoria || "outros";
      if (!catMonth[cat]) catMonth[cat] = {};
      catMonth[cat][mk] = (catMonth[cat][mk] || 0) + item.preco_total;
    }
  }

  // Include manual expenses in category aggregation
  for (const me of manualExpenses) {
    const mk = monthKey(me.data);
    monthSet.add(mk);
    const cat = (me.categoria || "outros").toLowerCase();
    const v = Number(me.valor) || 0;
    if (v <= 0) continue;
    if (!catMonth[cat]) catMonth[cat] = {};
    catMonth[cat][mk] = (catMonth[cat][mk] || 0) + v;
  }

  const pastMonths = [...monthSet].filter((m) => m !== currentMonth).sort();
  const recentMonths = pastMonths.slice(-3);
  const all: Recommendation[] = [];

  // ── 1) Gastos acima da média por categoria ──
  for (const [cat, months] of Object.entries(catMonth)) {
    if (recentMonths.length === 0) break;
    const pastAvg = recentMonths.reduce((s, m) => s + (months[m] || 0), 0) / recentMonths.length;
    const currentVal = months[currentMonth] || 0;
    if (pastAvg <= 0 || currentVal <= 0) continue;

    const projected = today > 0 ? (currentVal / today) * totalDays : currentVal;
    const pct = Math.round(((projected - pastAvg) / pastAvg) * 100);
    const diff = projected - pastAvg;

    if (pct > 15 && diff > 10) {
      const label = CAT_LABELS[cat] || cat;
      all.push({
        tipo: "economia_categoria",
        titulo: `${label} acima da média`,
        mensagem: `Seu gasto com ${label.toLowerCase()} está ${pct}% acima da média. Reduzir esse valor pode economizar cerca de ${fmt(diff)} neste mês.`,
        impacto_estimado: Math.round(diff),
      });
    }
  }

  // ── 2) Oportunidades de economia entre supermercados ──
  const storeProducts: Record<string, Record<string, { total: number; count: number; nome: string }>> = {};

  for (const r of receipts) {
    const storeId = r.store_id;
    const storeName = r.stores?.nome || "Loja";
    for (const item of r.receipt_items ?? []) {
      if (!storeProducts[item.nome_normalizado]) storeProducts[item.nome_normalizado] = {};
      const sp = storeProducts[item.nome_normalizado];
      if (!sp[storeId]) sp[storeId] = { total: 0, count: 0, nome: storeName };
      sp[storeId].total += item.preco_unitario;
      sp[storeId].count += 1;
    }
  }

  // Find products bought at multiple stores with price differences
  const savingsOpps: { produto: string; pctDiff: number; lojaBarata: string; lojaCara: string; economia: number }[] = [];

  for (const [produto, stores] of Object.entries(storeProducts)) {
    const storeIds = Object.keys(stores);
    if (storeIds.length < 2) continue;
    const avgs = storeIds.map((id) => ({
      id,
      avg: stores[id].total / stores[id].count,
      nome: stores[id].nome,
      count: stores[id].count,
    }));
    avgs.sort((a, b) => a.avg - b.avg);
    const cheapest = avgs[0];
    const expensive = avgs[avgs.length - 1];
    const pctDiff = Math.round(((expensive.avg - cheapest.avg) / expensive.avg) * 100);
    if (pctDiff >= 8) {
      savingsOpps.push({
        produto,
        pctDiff,
        lojaBarata: cheapest.nome,
        lojaCara: expensive.nome,
        economia: (expensive.avg - cheapest.avg) * expensive.count,
      });
    }
  }

  savingsOpps.sort((a, b) => b.economia - a.economia);
  if (savingsOpps.length > 0) {
    const top = savingsOpps.slice(0, 3);
    const totalEconomia = top.reduce((s, o) => s + o.economia, 0);
    const lojas = [...new Set(top.map((o) => o.lojaBarata))];
    all.push({
      tipo: "economia_supermercado",
      titulo: "Economia entre supermercados",
      mensagem: `Alguns produtos que você compra costumam ser mais baratos no ${lojas.join(" e ")}. Trocar pode economizar cerca de ${fmt(totalEconomia)} por mês.`,
      impacto_estimado: Math.round(totalEconomia),
    });
  }

  // ── 3) Tendência de aumento de gastos (últimos 30 dias vs 30 anteriores) ──
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];
  const sixtyStr = sixtyDaysAgo.toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const catRecent: Record<string, number> = {};
  const catPrior: Record<string, number> = {};

  // Receipts
  for (const r of receipts) {
    for (const item of r.receipt_items ?? []) {
      const cat = item.categoria || "outros";
      if (r.data_compra >= thirtyStr && r.data_compra <= todayStr) {
        catRecent[cat] = (catRecent[cat] || 0) + item.preco_total;
      } else if (r.data_compra >= sixtyStr && r.data_compra < thirtyStr) {
        catPrior[cat] = (catPrior[cat] || 0) + item.preco_total;
      }
    }
  }

  // Manual expenses in trend detection
  for (const me of manualExpenses) {
    const cat = (me.categoria || "outros").toLowerCase();
    const v = Number(me.valor) || 0;
    if (v <= 0) continue;
    if (me.data >= thirtyStr && me.data <= todayStr) {
      catRecent[cat] = (catRecent[cat] || 0) + v;
    } else if (me.data >= sixtyStr && me.data < thirtyStr) {
      catPrior[cat] = (catPrior[cat] || 0) + v;
    }
  }

  for (const cat of Object.keys(catRecent)) {
    const recent = catRecent[cat] || 0;
    const prior = catPrior[cat] || 0;
    if (prior <= 0) continue;
    const pct = Math.round(((recent - prior) / prior) * 100);
    if (pct > 20) {
      const label = CAT_LABELS[cat] || cat;
      all.push({
        tipo: "tendencia_aumento",
        titulo: `${label} em alta`,
        mensagem: `Seu gasto com ${label.toLowerCase()} aumentou ${pct}% nos últimos 30 dias.`,
        impacto_estimado: Math.round(recent - prior),
      });
    }
  }

  // ── 4) Sugestão de melhoria do score ──
  if (rendaMensal > 0) {
    const score = calculateFinancialScore(receipts as any, rendaMensal, fixedExpensesTotal, manualExpenses);
    if (score.score < 80 && score.score > 0) {
      // Find weakest pillar
      const { detalhes } = score;
      const pillars = [
        { key: "gasto_vs_renda", max: 30, val: detalhes.gasto_vs_renda, label: "gastos em relação à renda" },
        { key: "poupanca", max: 25, val: detalhes.poupanca, label: "taxa de poupança" },
        { key: "estabilidade", max: 20, val: detalhes.estabilidade, label: "estabilidade de gastos" },
        { key: "controle_categorias", max: 15, val: detalhes.controle_categorias, label: "categorias supérfluas" },
      ];
      pillars.sort((a, b) => (a.val / a.max) - (b.val / b.max));
      const weakest = pillars[0];
      const potentialGain = weakest.max - weakest.val;
      const newScore = Math.min(100, score.score + potentialGain);

      all.push({
        tipo: "melhoria_score",
        titulo: "Melhore seu score",
        mensagem: `Melhorando sua ${weakest.label}, seu score financeiro pode subir de ${score.score} para ${newScore}.`,
        impacto_estimado: potentialGain * 10, // weight score improvement
      });
    }
  }

  // ── 5) Sugestão de economia mensal consolidada ──
  const totalImpact = all.reduce((s, r) => s + r.impacto_estimado, 0);
  if (totalImpact > 50 && all.length >= 2) {
    all.push({
      tipo: "economia_mensal",
      titulo: "Economia potencial",
      mensagem: `Aplicando essas sugestões, você pode economizar cerca de ${fmt(totalImpact)} por mês.`,
      impacto_estimado: totalImpact,
    });
  }

  // Sort by impact, limit to 5
  all.sort((a, b) => b.impacto_estimado - a.impacto_estimado);
  return all.slice(0, 5);
}
