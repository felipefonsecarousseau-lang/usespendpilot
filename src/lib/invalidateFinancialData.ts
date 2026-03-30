import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./queryKeys";

/**
 * Invalidates dashboard-level queries: current month, fixed expenses, receipts list.
 * Use after: adding a quick expense, toggling paid/pending, adding/deleting fixed expenses.
 */
export function invalidateDashboardData(queryClient: QueryClient) {
  [
    QUERY_KEYS.dashboardReceipts,
    QUERY_KEYS.dashboardManual,
    QUERY_KEYS.dashboardAllReceipts,
    QUERY_KEYS.dashboardAllManual,
    QUERY_KEYS.dashboardFamily,
    QUERY_KEYS.dashboardFixedExpenses,
    QUERY_KEYS.fixedExpenses,
    QUERY_KEYS.fixedExpenseOccurrences,
    QUERY_KEYS.savedReceipts,
  ].forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
}

/**
 * Invalidates historical / analytics queries: gastos detalhados, visão financeira, insights.
 * Use after: saving or editing a receipt (affects historical aggregations).
 */
export function invalidateInsightsData(queryClient: QueryClient) {
  [
    QUERY_KEYS.gastosReceiptItems,
    QUERY_KEYS.gastosReceiptItemsPrev,
    QUERY_KEYS.gastosManual,
    QUERY_KEYS.visaoReceipts,
    QUERY_KEYS.visaoManual,
    QUERY_KEYS.visaoFixed,
    QUERY_KEYS.advancedInsights,
  ].forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
}

/**
 * Invalidates ALL financial data queries across the app.
 * Use sparingly — prefer the granular helpers above.
 * Only needed after bulk operations or data imports.
 */
export function invalidateFinancialData(queryClient: QueryClient) {
  invalidateDashboardData(queryClient);
  invalidateInsightsData(queryClient);
}
