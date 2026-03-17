import { describe, it, expect } from "vitest";
import { generateForecast } from "../financial-forecast";

const makeReceipt = (valor: number, data: string, items: { categoria: string; preco_total: number }[] = []) => ({
  valor_total: valor,
  data_compra: data,
  receipt_items: items.length > 0 ? items : [{ categoria: "mercado", preco_total: valor }],
});

describe("generateForecast", () => {
  it("returns safe defaults for empty receipts", () => {
    const result = generateForecast([], 5000);
    expect(result.gasto_atual_mes).toBe(0);
    expect(result.previsao_gasto_total).toBe(0);
    expect(result.saldo_previsto).toBe(5000);
    expect(result.tendencias).toEqual([]);
  });

  it("includes fixed expenses in saldo_previsto", () => {
    const result = generateForecast([], 5000, 2000);
    // saldo = renda - (projected_variable + fixed)
    expect(result.saldo_previsto).toBe(3000);
  });

  it("calculates saldo_previsto = renda - previsao_gasto_total", () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const receipts = [makeReceipt(500, today)];
    const result = generateForecast(receipts, 5000, 1000);
    expect(result.saldo_previsto).toBe(
      Math.round((5000 - result.previsao_gasto_total) * 100) / 100
    );
  });

  it("detects negative saldo correctly", () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    // High spending + high fixed = deficit
    const receipts = [makeReceipt(4000, today)];
    const result = generateForecast(receipts, 3000, 2000);
    expect(result.saldo_previsto).toBeLessThan(0);
    expect(result.mensagem_saldo).toContain("deficit");
  });

  it("calculates dias_restantes correctly", () => {
    const result = generateForecast([], 5000);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    expect(result.dias_restantes).toBe(daysInMonth - now.getDate());
  });

  it("uses fallback month when current month has no data", () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthDate = lastMonth.toISOString().split("T")[0];
    const receipts = [makeReceipt(800, lastMonthDate)];
    const result = generateForecast(receipts, 5000);
    expect(result.mes_referencia).not.toBeNull();
    expect(result.gasto_atual_mes).toBe(800);
  });
});
