/**
 * Structured event logger for SpendPilot.
 * Outputs JSON-compatible log entries to the console so they can be
 * captured by log aggregators (Supabase logs, Sentry, etc.) in production.
 *
 * Usage:
 *   logEvent("expense:create", { userId, amount, category });
 *   logEvent("ocr:error", { error: err.message });
 */
export function logEvent(event: string, data: Record<string, unknown> = {}): void {
  console.log(
    JSON.stringify({
      event,
      ...data,
      timestamp: new Date().toISOString(),
    })
  );
}
