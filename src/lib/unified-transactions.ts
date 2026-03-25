// Unified transaction model — single source of truth for all financial data
// All pages and engines should consume this model instead of querying sources independently.

export type TransactionSource = "ocr" | "manual" | "fixed";

export interface UnifiedTransaction {
  valor: number;
  data: string; // YYYY-MM-DD
  categoria: string;
  origem: TransactionSource;
  descricao: string;
}

// ─── Input types for building unified transactions ───

export interface ReceiptItemForUnification {
  preco_total: number;
  categoria: string;
  nome_normalizado: string;
  receipt_data_compra: string; // date from the parent receipt
}

export interface ManualExpenseForUnification {
  valor: number;
  data: string;
  categoria: string;
  nome: string;
}

export interface FixedOccurrenceForUnification {
  valor: number;
  mes: string; // YYYY-MM-DD (first of month)
  status: string;
  nome?: string;
  categoria?: string;
}

// ─── Builder ───

/**
 * Builds a unified list of transactions from all three data sources.
 * This is the canonical way to get a complete picture of user spending.
 */
export function buildUnifiedTransactions(
  receiptItems: ReceiptItemForUnification[],
  manualExpenses: ManualExpenseForUnification[],
  fixedOccurrences: FixedOccurrenceForUnification[]
): UnifiedTransaction[] {
  const transactions: UnifiedTransaction[] = [];

  for (const item of receiptItems) {
    const v = Number(item.preco_total) || 0;
    if (v <= 0) continue;
    transactions.push({
      valor: v,
      data: item.receipt_data_compra,
      categoria: item.categoria || "outros",
      origem: "ocr",
      descricao: item.nome_normalizado || "",
    });
  }

  for (const me of manualExpenses) {
    const v = Number(me.valor) || 0;
    if (v <= 0) continue;
    transactions.push({
      valor: v,
      data: me.data,
      categoria: (me.categoria || "outros").toLowerCase(),
      origem: "manual",
      descricao: me.nome || "",
    });
  }

  for (const occ of fixedOccurrences) {
    const v = Number(occ.valor) || 0;
    if (v <= 0) continue;
    transactions.push({
      valor: v,
      data: occ.mes,
      categoria: occ.categoria || "contas fixas",
      origem: "fixed",
      descricao: occ.nome || "Conta fixa",
    });
  }

  return transactions;
}

// ─── Filtering helpers ───

export function filterByMonth(txs: UnifiedTransaction[], monthKey: string): UnifiedTransaction[] {
  return txs.filter((t) => t.data.slice(0, 7) === monthKey);
}

export function filterByDateRange(txs: UnifiedTransaction[], start: string, end: string): UnifiedTransaction[] {
  return txs.filter((t) => t.data >= start && t.data <= end);
}

export function totalByCategory(txs: UnifiedTransaction[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of txs) {
    result[t.categoria] = (result[t.categoria] || 0) + t.valor;
  }
  return result;
}

export function totalAmount(txs: UnifiedTransaction[]): number {
  return txs.reduce((s, t) => s + t.valor, 0);
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}
