import { logEvent } from "./logEvent";

/**
 * Wraps a synchronous function in a try/catch.
 * Returns the function's result, or `null` on error.
 * Logs unexpected errors as structured events.
 *
 * Use for: OCR data transforms, financial calculations, data normalization.
 * Do NOT use for: async API calls (handle errors explicitly there).
 *
 * @example
 * const total = safeExecute(() => items.reduce((s, i) => s + i.price, 0)) ?? 0;
 */
export function safeExecute<T>(fn: () => T, context?: string): T | null {
  try {
    return fn();
  } catch (error) {
    logEvent("error:unexpected", {
      context: context ?? "unknown",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
