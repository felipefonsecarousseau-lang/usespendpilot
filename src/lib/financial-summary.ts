// Central financial aggregation — single source of truth for all analyses

export interface MonthlyFinancialSummary {
  total_gastos_variaveis: number;
  total_contas_fixas: number;
  total_gastos: number;
  total_pago: number;
  total_pendente: number;
}

interface ReceiptItemLike {
  preco_total: number;
}

interface OccurrenceLike {
  valor: number;
  status: "pending" | "paid" | string;
}

/**
 * Computes a unified monthly financial summary from receipt items and fixed expense occurrences.
 * This is the SINGLE SOURCE OF TRUTH for all financial calculations.
 */
export function getMonthlyFinancialSummary(
  receiptItems: ReceiptItemLike[],
  fixedOccurrences: OccurrenceLike[]
): MonthlyFinancialSummary {
  const total_gastos_variaveis = receiptItems.reduce(
    (sum, item) => {
      const v = Number(item.preco_total) || 0;
      return sum + (v > 0 ? v : 0);
    },
    0
  );

  let total_contas_fixas = 0;
  let total_pago = 0;
  let total_pendente = 0;

  for (const occ of fixedOccurrences) {
    const v = Number(occ.valor) || 0;
    if (v <= 0) continue;
    total_contas_fixas += v;
    if (occ.status === "paid") {
      total_pago += v;
    } else {
      total_pendente += v;
    }
  }

  return {
    total_gastos_variaveis: Math.round(total_gastos_variaveis * 100) / 100,
    total_contas_fixas: Math.round(total_contas_fixas * 100) / 100,
    total_gastos: Math.round((total_gastos_variaveis + total_contas_fixas) * 100) / 100,
    total_pago: Math.round(total_pago * 100) / 100,
    total_pendente: Math.round(total_pendente * 100) / 100,
  };
}
