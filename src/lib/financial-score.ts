// Financial health score engine — calculates a 0-100 score

export type ScoreLevel = "critico" | "alerta" | "bom" | "excelente";

export interface ScoreDetails {
  gasto_vs_renda: number;
  poupanca: number;
  estabilidade: number;
  controle_categorias: number;
}

export interface FinancialScore {
  score: number;
  nivel: ScoreLevel;
  detalhes: ScoreDetails;
  insight: string;
}

interface ReceiptRow {
  valor_total: number;
  data_compra: string;
  receipt_items: { categoria: string; preco_total: number }[];
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function getLevel(score: number): ScoreLevel {
  if (score >= 80) return "excelente";
  if (score >= 60) return "bom";
  if (score >= 40) return "alerta";
  return "critico";
}

const LEVEL_LABELS: Record<ScoreLevel, string> = {
  critico: "Crítico",
  alerta: "Alerta",
  bom: "Bom",
  excelente: "Excelente",
};

// Categories considered "critical" for overspending
const CRITICAL_CATS = ["bebidas", "padaria", "outros"];

export function calculateFinancialScore(
  receipts: ReceiptRow[],
  rendaMensal: number,
  fixedExpensesTotal = 0
): FinancialScore {
  if (rendaMensal <= 0 || receipts.length === 0) {
    return {
      score: 0,
      nivel: "critico",
      detalhes: { gasto_vs_renda: 0, poupanca: 0, estabilidade: 0, controle_categorias: 0 },
      insight: "Adicione sua renda e notas fiscais para calcular seu score financeiro.",
    };
  }

  const now = new Date();
  const currentMonth = monthKey(now.toISOString());

  // Group totals by month
  const monthlyTotals: Record<string, number> = {};
  const monthlyCatTotals: Record<string, Record<string, number>> = {};

  for (const r of receipts) {
    const mk = monthKey(r.data_compra);
    monthlyTotals[mk] = (monthlyTotals[mk] || 0) + r.valor_total;
    for (const item of r.receipt_items ?? []) {
      const cat = item.categoria || "outros";
      if (!monthlyCatTotals[mk]) monthlyCatTotals[mk] = {};
      monthlyCatTotals[mk][cat] = (monthlyCatTotals[mk][cat] || 0) + item.preco_total;
    }
  }

  const allMonths = Object.keys(monthlyTotals).sort();
  const pastMonths = allMonths.filter((m) => m !== currentMonth);
  const last3 = pastMonths.slice(-3);

  // Current month spending (projected to full month)
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentSpending = (monthlyTotals[currentMonth] || 0) + fixedExpensesTotal;
  const projectedSpending = today > 0 ? (currentSpending / today) * daysInMonth : currentSpending;
  const spendingToUse = last3.length > 0
    ? last3.reduce((s, m) => s + (monthlyTotals[m] || 0), 0) / last3.length
    : projectedSpending;

  // ── 1) Gasto vs Renda (max 30) ──
  const gastoRatio = spendingToUse / rendaMensal;
  let gastoVsRenda = 0;
  if (gastoRatio <= 0.6) gastoVsRenda = 30;
  else if (gastoRatio <= 0.8) gastoVsRenda = 20;
  else if (gastoRatio <= 1.0) gastoVsRenda = 10;

  // ── 2) Poupança (max 25) ──
  const savingsRatio = (rendaMensal - spendingToUse) / rendaMensal;
  let poupanca = 0;
  if (savingsRatio >= 0.2) poupanca = 25;
  else if (savingsRatio >= 0.1) poupanca = 15;
  else if (savingsRatio > 0) poupanca = 5;

  // ── 3) Estabilidade (max 20) ──
  let estabilidade = 10; // default
  if (last3.length >= 2) {
    const vals = last3.map((m) => monthlyTotals[m] || 0);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (avg > 0) {
      const maxDev = Math.max(...vals.map((v) => Math.abs(v - avg) / avg));
      if (maxDev < 0.1) estabilidade = 20;
      else if (maxDev < 0.25) estabilidade = 10;
      else estabilidade = 5;
    }
  }

  // ── 4) Controle de categorias críticas (max 15) ──
  let controleCategorias = 15;
  if (last3.length > 0) {
    let anyAbove = false;
    for (const cat of CRITICAL_CATS) {
      const pastAvg =
        last3.reduce((s, m) => s + (monthlyCatTotals[m]?.[cat] || 0), 0) / last3.length;
      const currentCat = monthlyCatTotals[currentMonth]?.[cat] || 0;
      const projectedCat = today > 0 ? (currentCat / today) * daysInMonth : currentCat;
      if (pastAvg > 0 && projectedCat > pastAvg * 1.1) {
        anyAbove = true;
        break;
      }
    }
    controleCategorias = anyAbove ? 5 : 15;
  }

  // ── 5) Final score ──
  const score = Math.min(100, gastoVsRenda + poupanca + estabilidade + controleCategorias);
  const nivel = getLevel(score);

  // Generate insight
  let insight = `Seu score financeiro atual é ${score} (${LEVEL_LABELS[nivel]}).`;
  if (gastoVsRenda < 20) {
    insight += " Reduzir seus gastos em relação à renda pode melhorar seu score.";
  } else if (poupanca < 15) {
    insight += " Aumentar sua taxa de poupança pode elevar seu score.";
  } else if (estabilidade < 15) {
    insight += " Manter gastos mais estáveis mês a mês pode ajudar.";
  } else if (controleCategorias < 15) {
    insight += " Controlar gastos em categorias supérfluas pode aumentar seu score.";
  }

  return {
    score,
    nivel,
    detalhes: {
      gasto_vs_renda: gastoVsRenda,
      poupanca,
      estabilidade,
      controle_categorias: controleCategorias,
    },
    insight,
  };
}
