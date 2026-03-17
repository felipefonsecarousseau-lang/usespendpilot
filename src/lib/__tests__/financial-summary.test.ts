import { describe, it, expect } from "vitest";
import { getMonthlyFinancialSummary } from "../financial-summary";

describe("getMonthlyFinancialSummary", () => {
  it("returns zeros for empty inputs", () => {
    const result = getMonthlyFinancialSummary([], []);
    expect(result).toEqual({
      total_gastos_variaveis: 0,
      total_contas_fixas: 0,
      total_gastos_manuais: 0,
      total_gastos: 0,
      total_pago: 0,
      total_pendente: 0,
    });
  });

  it("calculates receipt items correctly", () => {
    const items = [
      { preco_total: 45.50 },
      { preco_total: 12.30 },
      { preco_total: 8.20 },
    ];
    const result = getMonthlyFinancialSummary(items, []);
    expect(result.total_gastos_variaveis).toBe(66);
    expect(result.total_gastos).toBe(66);
  });

  it("calculates fixed expenses with paid/pending split", () => {
    const fixed = [
      { valor: 1000, status: "paid" },
      { valor: 100, status: "pending" },
      { valor: 170, status: "pending" },
    ];
    const result = getMonthlyFinancialSummary([], fixed);
    expect(result.total_contas_fixas).toBe(1270);
    expect(result.total_pago).toBe(1000);
    expect(result.total_pendente).toBe(270);
  });

  it("calculates manual expenses correctly", () => {
    const manual = [
      { valor: 40 },
      { valor: 25.50 },
    ];
    const result = getMonthlyFinancialSummary([], [], manual);
    expect(result.total_gastos_manuais).toBe(65.50);
    expect(result.total_gastos).toBe(65.50);
  });

  it("combines all three sources correctly (critical consolidation test)", () => {
    const receiptItems = [
      { preco_total: 150.00 },
      { preco_total: 80.00 },
      { preco_total: 45.00 },
    ];
    const fixedOccurrences = [
      { valor: 1000, status: "paid" },
      { valor: 100, status: "pending" },
    ];
    const manualExpenses = [
      { valor: 40 },
    ];

    const result = getMonthlyFinancialSummary(receiptItems, fixedOccurrences, manualExpenses);

    expect(result.total_gastos_variaveis).toBe(275);
    expect(result.total_contas_fixas).toBe(1100);
    expect(result.total_gastos_manuais).toBe(40);
    expect(result.total_gastos).toBe(1415);
    expect(result.total_pago).toBe(1000);
    expect(result.total_pendente).toBe(100);
  });

  it("ignores negative and zero values", () => {
    const items = [
      { preco_total: -10 },
      { preco_total: 0 },
      { preco_total: 50 },
    ];
    const fixed = [
      { valor: -100, status: "paid" },
      { valor: 0, status: "pending" },
      { valor: 200, status: "paid" },
    ];
    const manual = [
      { valor: -5 },
      { valor: 30 },
    ];
    const result = getMonthlyFinancialSummary(items, fixed, manual);
    expect(result.total_gastos_variaveis).toBe(50);
    expect(result.total_contas_fixas).toBe(200);
    expect(result.total_gastos_manuais).toBe(30);
    expect(result.total_gastos).toBe(280);
  });

  it("handles NaN/string values gracefully", () => {
    const items = [{ preco_total: NaN }, { preco_total: "abc" as any }, { preco_total: 100 }];
    const result = getMonthlyFinancialSummary(items, []);
    expect(result.total_gastos_variaveis).toBe(100);
  });

  it("rounds to 2 decimal places", () => {
    const items = [
      { preco_total: 10.333 },
      { preco_total: 20.667 },
    ];
    const result = getMonthlyFinancialSummary(items, []);
    expect(result.total_gastos_variaveis).toBe(31);
    expect(result.total_gastos).toBe(31);
  });

  it("ensures consistency: total = variaveis + fixas + manuais", () => {
    const items = [{ preco_total: 99.99 }];
    const fixed = [{ valor: 500.01, status: "paid" }];
    const manual = [{ valor: 25.50 }];
    const result = getMonthlyFinancialSummary(items, fixed, manual);
    expect(result.total_gastos).toBe(
      result.total_gastos_variaveis + result.total_contas_fixas + result.total_gastos_manuais
    );
  });

  it("ensures consistency: pago + pendente = contas_fixas", () => {
    const fixed = [
      { valor: 300, status: "paid" },
      { valor: 200, status: "pending" },
      { valor: 150, status: "paid" },
    ];
    const result = getMonthlyFinancialSummary([], fixed);
    expect(result.total_pago + result.total_pendente).toBe(result.total_contas_fixas);
  });
});
