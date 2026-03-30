import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";

/**
 * Invalidates all financial data queries across the app.
 * Call this after any mutation that changes financial data
 * (adding expense, saving receipt, deleting, etc.) so that
 * every page reflects the latest state without a full refresh.
 */
export function invalidateFinancialData(queryClient: QueryClient) {
  const keys = [
    QUERY_KEYS.dashboardReceipts,
    QUERY_KEYS.dashboardManual,
    QUERY_KEYS.dashboardAllReceipts,
    QUERY_KEYS.dashboardAllManual,
    QUERY_KEYS.dashboardFamily,
    QUERY_KEYS.dashboardFixedExpenses,
    QUERY_KEYS.fixedExpenses,
    QUERY_KEYS.fixedExpenseOccurrences,
    QUERY_KEYS.gastosReceiptItems,
    QUERY_KEYS.gastosReceiptItemsPrev,
    QUERY_KEYS.gastosManual,
    QUERY_KEYS.savedReceipts,
    QUERY_KEYS.visaoReceipts,
    QUERY_KEYS.visaoManual,
    QUERY_KEYS.visaoFixed,
    QUERY_KEYS.advancedInsights,
  ];
  keys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}
