/**
 * Centralized query keys for React Query cache management.
 * Use these keys (or their prefixes) for all invalidateQueries calls.
 *
 * Prefix matching: invalidating ["dashboard-receipts"] will also match
 * ["dashboard-receipts", currentMonthStart] etc.
 */
export const QUERY_KEYS = {
  // Dashboard
  dashboardReceipts: ["dashboard-receipts"],
  dashboardManual: ["dashboard-manual-expenses"],
  dashboardAllReceipts: ["dashboard-all-receipts"],
  dashboardAllManual: ["dashboard-all-manual-expenses"],
  dashboardFamily: ["dashboard-family"],
  dashboardFixedExpenses: ["dashboard-fixed-expenses"],

  // Fixed expenses
  fixedExpenses: ["fixed-expenses"],
  fixedExpenseOccurrences: ["fixed-expense-occurrences"],

  // Detailed expenses (gastos detalhados)
  gastosReceiptItems: ["gastos-receipt-items"],
  gastosReceiptItemsPrev: ["gastos-receipt-items-prev"],
  gastosManual: ["gastos-manual-expenses"],

  // Receipts
  savedReceipts: ["saved-receipts"],

  // Visão financeira
  visaoReceipts: ["visao-receipts"],
  visaoManual: ["visao-manual"],
  visaoFixed: ["visao-fixed"],

  // Premium / plan
  premiumStatus: ["premium-status"],
  fullPlanStatus: ["full-plan-status"],
  subscriptionDetails: ["subscription-details"],

  // Insights
  advancedInsights: ["advanced-insights-data"],
} as const;
