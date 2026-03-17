import { describe, it, expect } from "vitest";
import { calculateFinancialScore } from "../financial-score";

const makeReceipt = (valor: number, data: string, items: { categoria: string; preco_total: number }[] = []) => ({
  valor_total: valor,
  data_compra: data,
  receipt_items: items.length > 0 ? items : [{ categoria: "mercado", preco_total: valor }],
});

describe("calculateFinancialScore", () => {
  it("returns score 0 when no income", () => {
    const result = calculateFinancialScore([], 0);
    expect(result.score).toBe(0);
    expect(result.nivel).toBe("critico");
  });

  it("returns score 0 when no data and no fixed expenses", () => {
    const result = calculateFinancialScore([], 5000, 0);
    expect(result.score).toBe(0);
  });

  it("includes fixed expenses in score calculation", () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const receipts = [makeReceipt(500, today)];

    const scoreWithout = calculateFinancialScore(receipts, 5000, 0);
    const scoreWith = calculateFinancialScore(receipts, 5000, 3000);

    // Adding large fixed expenses should lower score
    expect(scoreWith.score).toBeLessThanOrEqual(scoreWithout.score);
  });

  it("high spending ratio yields low score", () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    // Spending almost all income via fixed expenses
    const result = calculateFinancialScore([makeReceipt(100, today)], 5000, 4500);
    expect(result.score).toBeLessThan(60);
  });

  it("low spending ratio yields high score", () => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const result = calculateFinancialScore([makeReceipt(100, today)], 10000, 500);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it("score levels are correct ranges", () => {
    const now = new Date();
    const d = now.toISOString().split("T")[0];

    // Very low spending = excelente or bom
    const r1 = calculateFinancialScore([makeReceipt(100, d)], 50000, 0);
    expect(["excelente", "bom"]).toContain(r1.nivel);

    // Score 0 = critico
    const r2 = calculateFinancialScore([], 0, 0);
    expect(r2.nivel).toBe("critico");
  });

  it("generates a meaningful insight string", () => {
    const now = new Date();
    const d = now.toISOString().split("T")[0];
    const result = calculateFinancialScore([makeReceipt(1000, d)], 5000, 1000);
    expect(result.insight).toBeTruthy();
    expect(result.insight.length).toBeGreaterThan(10);
  });

  it("score components sum to total score", () => {
    const now = new Date();
    const d = now.toISOString().split("T")[0];
    const result = calculateFinancialScore([makeReceipt(500, d)], 5000, 500);
    const { detalhes } = result;
    const sum = detalhes.gasto_vs_renda + detalhes.poupanca + detalhes.estabilidade + detalhes.controle_categorias;
    expect(result.score).toBe(Math.min(100, sum));
  });
});
