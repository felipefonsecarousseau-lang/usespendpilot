// Engine for "Outros gastos" — financial health analysis on manual + fixed expenses
import type { UnifiedTransaction } from "./unified-transactions";

export interface SpendingPattern {
  tipo: "recorrente_alto" | "categoria_excesso" | "superfluo" | "fixo_pesado";
  titulo: string;
  mensagem: string;
  impacto: number;
  acao: "reduzir" | "otimizar" | "cortar";
  icone: string;
}

export interface SpendingHealthResult {
  score: number; // 0-100
  nivel: "critico" | "alerta" | "bom" | "excelente";
  patterns: SpendingPattern[];
  categoriaPesos: { categoria: string; total: number; pct: number }[];
  fixoVsVariavel: { fixo: number; variavel: number; pctFixo: number };
}

const CATEGORY_THRESHOLDS: Record<string, number> = {
  lazer: 0.15,
  restaurante: 0.12,
  streaming: 0.08,
  transporte: 0.20,
  contas: 0.35,
};

function fmt(v: number) {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export function analyzeSpendingHealth(
  transactions: UnifiedTransaction[],
  rendaMensal: number,
): SpendingHealthResult {
  const patterns: SpendingPattern[] = [];

  // Only non-OCR transactions
  const txs = transactions.filter((t) => t.origem === "manual" || t.origem === "fixed");
  if (txs.length === 0) {
    return {
      score: 100,
      nivel: "excelente",
      patterns: [],
      categoriaPesos: [],
      fixoVsVariavel: { fixo: 0, variavel: 0, pctFixo: 0 },
    };
  }

  // Group by month to get monthly averages
  const monthMap = new Map<string, number>();
  for (const t of txs) {
    const mk = t.data.slice(0, 7);
    monthMap.set(mk, (monthMap.get(mk) || 0) + t.valor);
  }
  const months = Math.max(monthMap.size, 1);

  // Category totals
  const catMap = new Map<string, number>();
  for (const t of txs) {
    const cat = t.categoria.toLowerCase();
    catMap.set(cat, (catMap.get(cat) || 0) + t.valor);
  }
  const totalGasto = txs.reduce((s, t) => s + t.valor, 0);
  const monthlyAvg = totalGasto / months;

  const categoriaPesos = [...catMap.entries()]
    .map(([categoria, total]) => ({ categoria, total, pct: total / totalGasto }))
    .sort((a, b) => b.total - a.total);

  // Fixed vs variable
  const fixoTotal = txs.filter((t) => t.origem === "fixed").reduce((s, t) => s + t.valor, 0);
  const variavelTotal = totalGasto - fixoTotal;
  const pctFixo = totalGasto > 0 ? fixoTotal / totalGasto : 0;

  // --- Pattern 1: Categories exceeding thresholds ---
  const renda = rendaMensal > 0 ? rendaMensal : monthlyAvg * 1.5;
  for (const { categoria, total } of categoriaPesos) {
    const threshold = CATEGORY_THRESHOLDS[categoria];
    if (!threshold) continue;
    const monthlyVal = total / months;
    const pctOfRenda = monthlyVal / renda;
    if (pctOfRenda > threshold) {
      const excesso = monthlyVal - threshold * renda;
      patterns.push({
        tipo: "categoria_excesso",
        titulo: `${categoria} acima do ideal`,
        mensagem: `Você gasta ${fmt(monthlyVal)}/mês em ${categoria} (${(pctOfRenda * 100).toFixed(0)}% da renda). O recomendado é até ${(threshold * 100).toFixed(0)}%.`,
        impacto: excesso,
        acao: "reduzir",
        icone: "⚠️",
      });
    }
  }

  // --- Pattern 2: Recurring high expenses (same description appearing 3+ times) ---
  const descCount = new Map<string, { count: number; total: number; cat: string }>();
  for (const t of txs) {
    if (!t.descricao) continue;
    const key = t.descricao.toLowerCase();
    const e = descCount.get(key) || { count: 0, total: 0, cat: t.categoria };
    e.count += 1;
    e.total += t.valor;
    descCount.set(key, e);
  }
  for (const [desc, { count, total }] of descCount) {
    if (count >= 3 && total / months > 50) {
      patterns.push({
        tipo: "recorrente_alto",
        titulo: `"${desc}" é recorrente`,
        mensagem: `Aparece ${count} vezes totalizando ${fmt(total)}. Média de ${fmt(total / months)}/mês.`,
        impacto: total / months * 0.2,
        acao: "otimizar",
        icone: "🔄",
      });
    }
  }

  // --- Pattern 3: Fixed costs too heavy ---
  if (pctFixo > 0.65 && fixoTotal > 0) {
    patterns.push({
      tipo: "fixo_pesado",
      titulo: "Contas fixas dominam seus gastos",
      mensagem: `${(pctFixo * 100).toFixed(0)}% dos seus gastos são fixos (${fmt(fixoTotal / months)}/mês). Tente renegociar ou cortar serviços pouco usados.`,
      impacto: (pctFixo - 0.5) * monthlyAvg,
      acao: "otimizar",
      icone: "📌",
    });
  }

  // --- Pattern 4: Potentially superfluous (small frequent expenses) ---
  const smallFrequent = [...descCount.entries()]
    .filter(([, v]) => v.count >= 4 && v.total / v.count < 30)
    .sort((a, b) => b[1].total - a[1].total);
  for (const [desc, { count, total }] of smallFrequent.slice(0, 2)) {
    patterns.push({
      tipo: "superfluo",
      titulo: `Gasto frequente: "${desc}"`,
      mensagem: `${count} vezes, totalizando ${fmt(total)}. Considere se realmente precisa.`,
      impacto: total * 0.5,
      acao: "cortar",
      icone: "✂️",
    });
  }

  // Sort by impact
  patterns.sort((a, b) => b.impacto - a.impacto);

  // --- Score calculation ---
  let score = 100;

  // Gasto vs renda (if known)
  if (rendaMensal > 0) {
    const ratio = monthlyAvg / rendaMensal;
    if (ratio > 1) score -= 30;
    else if (ratio > 0.8) score -= 20;
    else if (ratio > 0.6) score -= 10;
  }

  // Fixed weight penalty
  if (pctFixo > 0.7) score -= 15;
  else if (pctFixo > 0.6) score -= 8;

  // Category excesses penalty
  score -= Math.min(patterns.filter((p) => p.tipo === "categoria_excesso").length * 8, 25);

  // Patterns penalty
  score -= Math.min(patterns.length * 3, 15);

  score = Math.max(0, Math.min(100, score));

  const nivel =
    score >= 80 ? "excelente" : score >= 60 ? "bom" : score >= 40 ? "alerta" : "critico";

  return {
    score,
    nivel,
    patterns: patterns.slice(0, 6),
    categoriaPesos,
    fixoVsVariavel: { fixo: fixoTotal / months, variavel: variavelTotal / months, pctFixo },
  };
}
