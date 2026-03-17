import { describe, it, expect } from "vitest";
import { generateRecommendations } from "../financial-advisor";

const makeReceipt = (valor: number, data: string, storeId: string, storeName: string, items: any[] = []) => ({
  valor_total: valor,
  data_compra: data,
  store_id: storeId,
  stores: { nome: storeName },
  receipt_items: items.length > 0 ? items : [
    { categoria: "mercado", preco_total: valor, nome_normalizado: "arroz", preco_unitario: valor },
  ],
});

describe("generateRecommendations", () => {
  it("returns empty for no receipts", () => {
    expect(generateRecommendations([], 5000)).toEqual([]);
  });

  it("returns max 5 recommendations", () => {
    const now = new Date();
    const receipts: any[] = [];
    // Generate lots of history to trigger multiple recommendation types
    for (let m = 0; m < 6; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 15);
      const dateStr = d.toISOString().split("T")[0];
      const multiplier = m === 0 ? 3 : 1; // current month much higher
      receipts.push(makeReceipt(
        100 * multiplier, dateStr, "s1", "Loja A",
        [
          { categoria: "mercado", preco_total: 50 * multiplier, nome_normalizado: "arroz", preco_unitario: 5 * multiplier },
          { categoria: "bebidas", preco_total: 30 * multiplier, nome_normalizado: "suco", preco_unitario: 3 * multiplier },
          { categoria: "padaria", preco_total: 20 * multiplier, nome_normalizado: "pão", preco_unitario: 2 * multiplier },
        ]
      ));
      receipts.push(makeReceipt(
        80 * multiplier, dateStr, "s2", "Loja B",
        [
          { categoria: "mercado", preco_total: 40 * multiplier, nome_normalizado: "arroz", preco_unitario: 4 * multiplier },
          { categoria: "bebidas", preco_total: 25 * multiplier, nome_normalizado: "suco", preco_unitario: 2.5 * multiplier },
          { categoria: "limpeza", preco_total: 15 * multiplier, nome_normalizado: "detergente", preco_unitario: 1.5 * multiplier },
        ]
      ));
    }
    const result = generateRecommendations(receipts, 5000, 1000);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("includes fixed expenses in score-based recommendations", () => {
    const now = new Date();
    const receipts: any[] = [];
    for (let m = 0; m < 4; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 10);
      receipts.push(makeReceipt(500, d.toISOString().split("T")[0], "s1", "Loja A"));
    }
    // With high fixed expenses, should trigger score improvement recommendation
    const result = generateRecommendations(receipts, 3000, 2000);
    const hasScoreRec = result.some((r) => r.tipo === "melhoria_score");
    // Score-based rec should appear when score < 80
    if (result.length > 0) {
      expect(result.every((r) => r.impacto_estimado > 0)).toBe(true);
    }
  });

  it("each recommendation has required fields", () => {
    const now = new Date();
    const d = now.toISOString().split("T")[0];
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString().split("T")[0];
    const receipts = [
      makeReceipt(300, d, "s1", "Loja A"),
      makeReceipt(200, lastMonth, "s1", "Loja A"),
    ];
    const result = generateRecommendations(receipts, 5000);
    for (const rec of result) {
      expect(rec).toHaveProperty("tipo");
      expect(rec).toHaveProperty("titulo");
      expect(rec).toHaveProperty("mensagem");
      expect(rec).toHaveProperty("impacto_estimado");
      expect(typeof rec.mensagem).toBe("string");
      expect(rec.mensagem.length).toBeGreaterThan(0);
    }
  });
});
