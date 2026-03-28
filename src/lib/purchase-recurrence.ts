// Purchase recurrence engine — analyzes product purchase patterns from receipt history.
// No external AI needed; pure heuristics based on dates and quantities.

export interface PurchaseRecord {
  nome_normalizado: string;
  quantidade: number;
  preco_unitario: number;
  data_compra: string; // YYYY-MM-DD
}

export type SuggestionPriority = "alta" | "media" | "baixa";

export interface ProductRecurrence {
  nome: string;
  /** Average days between purchases */
  averagePurchaseInterval: number;
  /** Date of most recent purchase (YYYY-MM-DD) */
  lastPurchaseDate: string;
  /** Average quantity bought per purchase */
  averageQuantity: number;
  /** Last quantity bought */
  lastQuantity: number;
  /** Total times purchased in the dataset */
  purchaseCount: number;
  /** Days since last purchase */
  daysSinceLastPurchase: number;
  /** Whether the product is due for repurchase */
  isDue: boolean;
  /** Priority level */
  priority: SuggestionPriority;
  /** Human-readable frequency label */
  frequencyLabel: string;
}

/**
 * Compute the average interval in days between sorted date strings.
 */
function avgInterval(dates: string[]): number {
  if (dates.length < 2) return 30; // default assumption: monthly
  const sorted = [...dates].sort();
  let totalDays = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86_400_000;
    totalDays += diff;
  }
  return Math.round(totalDays / (sorted.length - 1));
}

function frequencyLabel(intervalDays: number): string {
  if (intervalDays <= 3) return "a cada poucos dias";
  if (intervalDays <= 8) return "semanal";
  if (intervalDays <= 16) return "quinzenal";
  if (intervalDays <= 35) return "mensal";
  return `a cada ~${intervalDays} dias`;
}

function computePriority(
  daysSinceLast: number,
  avgInterval: number,
  lastQty: number,
  avgQty: number,
  purchaseCount: number
): SuggestionPriority {
  const ratio = daysSinceLast / avgInterval;

  // High priority: overdue by 20%+ OR last quantity was below average (ran out faster)
  if (ratio >= 1.2) return "alta";
  if (ratio >= 1.0 && lastQty < avgQty * 0.8) return "alta";

  // Medium: approaching the interval (80%+)
  if (ratio >= 0.8) return "media";

  // High-frequency items that are at 60%+ of interval
  if (purchaseCount >= 4 && ratio >= 0.6) return "media";

  return "baixa";
}

/**
 * Analyze purchase history and return recurrence data per product.
 */
export function analyzeRecurrence(records: PurchaseRecord[]): ProductRecurrence[] {
  // Group by normalized name
  const groups = new Map<string, PurchaseRecord[]>();
  for (const r of records) {
    const key = r.nome_normalizado.toLowerCase();
    const list = groups.get(key) || [];
    list.push(r);
    groups.set(key, list);
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const results: ProductRecurrence[] = [];

  for (const [, recs] of groups) {
    if (recs.length < 2) continue; // need at least 2 purchases for a pattern

    const dates = recs.map((r) => r.data_compra);
    const sortedDates = [...dates].sort();
    const lastDate = sortedDates[sortedDates.length - 1];
    const interval = avgInterval(sortedDates);

    const quantities = recs.map((r) => Number(r.quantidade) || 1);
    const avgQty = quantities.reduce((s, q) => s + q, 0) / quantities.length;

    // Last purchase record (most recent)
    const lastRec = recs.reduce((a, b) => (a.data_compra > b.data_compra ? a : b));
    const lastQty = Number(lastRec.quantidade) || 1;

    const daysSinceLast = Math.max(
      0,
      Math.round((today.getTime() - new Date(lastDate).getTime()) / 86_400_000)
    );

    const isDue = daysSinceLast >= interval;
    const priority = computePriority(daysSinceLast, interval, lastQty, avgQty, recs.length);

    // Use the display name from the most recent record
    const nome = lastRec.nome_normalizado;

    results.push({
      nome,
      averagePurchaseInterval: interval,
      lastPurchaseDate: lastDate,
      averageQuantity: Math.round(avgQty * 10) / 10,
      lastQuantity: lastQty,
      purchaseCount: recs.length,
      daysSinceLastPurchase: daysSinceLast,
      isDue,
      priority,
      frequencyLabel: frequencyLabel(interval),
    });
  }

  return results;
}

/**
 * Filter and sort products that are suggested for repurchase.
 * Returns items sorted by priority (alta → media → baixa), then by overdue ratio.
 */
export function getSuggestions(recurrences: ProductRecurrence[]): ProductRecurrence[] {
  // Only suggest items that are at least "baixa" priority and approaching their interval
  const candidates = recurrences.filter((r) => {
    const ratio = r.daysSinceLastPurchase / r.averagePurchaseInterval;
    return ratio >= 0.6; // at least 60% of interval elapsed
  });

  const priorityOrder: Record<SuggestionPriority, number> = { alta: 0, media: 1, baixa: 2 };

  return candidates.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    // Within same priority, sort by overdue ratio (higher = more urgent)
    const ratioA = a.daysSinceLastPurchase / a.averagePurchaseInterval;
    const ratioB = b.daysSinceLastPurchase / b.averagePurchaseInterval;
    return ratioB - ratioA;
  });
}
