// Financial forecast engine — predicts future spending based on historical data

export interface CategoryForecast {
  categoria: string;
  valor_previsto: number;
  media_mensal: number;
}

export interface SpendingTrend {
  categoria: string;
  variacao: number; // percentage change
}

export interface FinancialForecast {
  previsao_gasto_total: number;
  saldo_previsto: number;
  gasto_atual_mes: number;
  dias_restantes: number;
  media_diaria_atual: number;
  previsao_por_categoria: CategoryForecast[];
  tendencias: SpendingTrend[];
  mensagem_gasto: string;
  mensagem_saldo: string;
  mes_referencia: string | null; // null = current month, "YYYY-MM" = fallback month
}

interface ReceiptRow {
  valor_total: number;
  data_compra: string;
  receipt_items: { categoria: string; preco_total: number }[];
}

function monthKey(date: string) {
  return date.slice(0, 7); // "YYYY-MM"
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function fmt(val: number) {
  return `R$ ${val.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/**
 * Generate financial forecasts from receipt history.
 * @param receipts - Array of receipt rows with nested items
 * @param rendaMensal - Monthly household income
 * @param fixedExpensesTotal - Total fixed expenses for the current month (from fixed_expense_occurrences)
 * @param monthsBack - How many months of history to consider (default 6)
 */
export function generateForecast(
  receipts: ReceiptRow[],
  rendaMensal: number,
  fixedExpensesTotal = 0,
  monthsBack = 6
): FinancialForecast {
  const now = new Date();
  const currentMonth = monthKey(now.toISOString());
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth();
  const today = now.getDate();
  const totalDays = daysInMonth(currentYear, currentMonthNum);
  const diasRestantes = totalDays - today;

  // Build cutoff date
  const cutoff = new Date(currentYear, currentMonthNum - monthsBack, 1);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // Filter to relevant window
  const relevant = receipts.filter((r) => r.data_compra >= cutoffStr);

  // ── 1) Aggregate by category × month ──
  const catMonth: Record<string, Record<string, number>> = {};
  const monthSet = new Set<string>();

  for (const r of relevant) {
    const mk = monthKey(r.data_compra);
    monthSet.add(mk);
    for (const item of r.receipt_items ?? []) {
      const cat = item.categoria || "outros";
      if (!catMonth[cat]) catMonth[cat] = {};
      catMonth[cat][mk] = (catMonth[cat][mk] || 0) + item.preco_total;
    }
  }

  // Sorted months excluding current
  const pastMonths = [...monthSet].filter((m) => m !== currentMonth).sort();
  const recentMonths = pastMonths.slice(-3);

  // ── 2) Category forecasts ──
  const previsao_por_categoria: CategoryForecast[] = [];

  for (const [cat, months] of Object.entries(catMonth)) {
    const pastValues = pastMonths.map((m) => months[m] || 0);
    if (pastValues.length === 0) continue;

    const media = pastValues.reduce((a, b) => a + b, 0) / pastValues.length;

    // Weight recent months more: simple linear trend
    const recentValues = recentMonths.map((m) => months[m] || 0);
    const recentAvg =
      recentValues.length > 0
        ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length
        : media;

    // Blend: 60% recent trend + 40% overall average
    const predicted = recentAvg * 0.6 + media * 0.4;

    previsao_por_categoria.push({
      categoria: cat,
      valor_previsto: Math.round(predicted * 100) / 100,
      media_mensal: Math.round(media * 100) / 100,
    });
  }

  previsao_por_categoria.sort((a, b) => b.valor_previsto - a.valor_previsto);

  // ── 3) Current month spending & projection ──
  const currentReceipts = receipts.filter(
    (r) => monthKey(r.data_compra) === currentMonth
  );
  let gastoAtualMes = currentReceipts.reduce(
    (s, r) => s + r.valor_total,
    0
  );

  // If no current month data, use the most recent month that has data
  let mesFallback: string | null = null;
  if (gastoAtualMes === 0 && relevant.length > 0) {
    const sortedMonths = [...monthSet].sort().reverse();
    if (sortedMonths.length > 0) {
      mesFallback = sortedMonths[0];
      const fallbackReceipts = receipts.filter(
        (r) => monthKey(r.data_compra) === mesFallback
      );
      gastoAtualMes = fallbackReceipts.reduce(
        (s, r) => s + r.valor_total,
        0
      );
    }
  }

  const mediaDiariaAtual = mesFallback
    ? 0
    : (today > 0 ? gastoAtualMes / today : 0);
  const previsaoGastoTotal = mesFallback
    ? gastoAtualMes
    : gastoAtualMes + mediaDiariaAtual * diasRestantes;

  // ── 4) Balance forecast ──
  const saldoPrevisto = rendaMensal - previsaoGastoTotal;

  // ── 5) Trend detection (>10% increase) ──
  const tendencias: SpendingTrend[] = [];

  for (const [cat, months] of Object.entries(catMonth)) {
    const recentValues = recentMonths.map((m) => months[m] || 0);
    const recentAvg =
      recentValues.length > 0
        ? recentValues.reduce((a, b) => a + b, 0) / recentValues.length
        : 0;

    const currentValue = months[currentMonth] || 0;
    if (recentAvg > 0 && currentValue > 0) {
      // Project current month to full month
      const projectedCurrent =
        today > 0 ? (currentValue / today) * totalDays : currentValue;
      const variacao = ((projectedCurrent - recentAvg) / recentAvg) * 100;

      if (variacao > 10) {
        tendencias.push({
          categoria: cat,
          variacao: Math.round(variacao),
        });
      }
    }
  }

  tendencias.sort((a, b) => b.variacao - a.variacao);

  return {
    previsao_gasto_total: Math.round(previsaoGastoTotal * 100) / 100,
    saldo_previsto: Math.round(saldoPrevisto * 100) / 100,
    gasto_atual_mes: Math.round(gastoAtualMes * 100) / 100,
    dias_restantes: diasRestantes,
    media_diaria_atual: Math.round(mediaDiariaAtual * 100) / 100,
    previsao_por_categoria,
    tendencias,
    mes_referencia: mesFallback,
    mensagem_gasto: mesFallback
      ? `Dados referentes ao mês mais recente com registros.`
      : `Se continuar nesse ritmo, você gastará aproximadamente ${fmt(previsaoGastoTotal)} neste mês.`,
    mensagem_saldo: saldoPrevisto >= 0
      ? `Seu saldo estimado no final do mês é de ${fmt(saldoPrevisto)}.`
      : `Atenção: você pode fechar o mês com deficit de ${fmt(Math.abs(saldoPrevisto))}.`,
  };
}
