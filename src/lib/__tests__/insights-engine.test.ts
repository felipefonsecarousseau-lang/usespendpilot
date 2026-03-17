import { describe, it, expect } from "vitest";
import { generateInsights } from "../insights-engine";

const makeItem = (nome: string, preco: number, storeId: string, storeName: string) => ({
  nome_normalizado: nome,
  preco_unitario: preco,
  preco_total: preco,
  quantidade: 1,
  store_id: storeId,
  store_nome: storeName,
});

describe("generateInsights", () => {
  it("returns empty for no items", () => {
    expect(generateInsights([], 30)).toEqual([]);
  });

  it("detects cheaper product at another store", () => {
    const items = [
      makeItem("arroz", 10, "s1", "Loja A"),
      makeItem("arroz", 10, "s1", "Loja A"),
      makeItem("arroz", 6, "s2", "Loja B"),
      makeItem("arroz", 6, "s2", "Loja B"),
    ];
    const result = generateInsights(items, 30);
    const cheaper = result.find((i) => i.tipo === "produto_mais_barato");
    expect(cheaper).toBeDefined();
    expect(cheaper!.mensagem).toContain("Loja B");
  });

  it("detects price variation", () => {
    const items = [
      makeItem("leite", 5, "s1", "Loja A"),
      makeItem("leite", 8, "s2", "Loja B"),
    ];
    const result = generateInsights(items, 30);
    const variacao = result.find((i) => i.tipo === "variacao_preco");
    // 60% variation should be detected
    expect(variacao).toBeDefined();
  });

  it("detects cheapest store overall", () => {
    const items = [
      makeItem("arroz", 5, "s1", "Loja Barata"),
      makeItem("feijao", 4, "s1", "Loja Barata"),
      makeItem("arroz", 8, "s2", "Loja Cara"),
      makeItem("feijao", 7, "s2", "Loja Cara"),
    ];
    const result = generateInsights(items, 30);
    const storeInsight = result.find((i) => i.tipo === "supermercado_economico");
    expect(storeInsight).toBeDefined();
    expect(storeInsight!.mensagem).toContain("Loja Barata");
  });

  it("returns max 5 insights", () => {
    // Create many products across stores to generate many insights
    const items: any[] = [];
    for (let i = 0; i < 20; i++) {
      items.push(makeItem(`produto_${i}`, 10 + i, "s1", "Loja A"));
      items.push(makeItem(`produto_${i}`, 5 + i, "s2", "Loja B"));
    }
    const result = generateInsights(items, 30);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("limits to max 2 of same type", () => {
    const items: any[] = [];
    for (let i = 0; i < 10; i++) {
      items.push(makeItem(`item_${i}`, 20, "s1", "A"));
      items.push(makeItem(`item_${i}`, 10, "s2", "B"));
    }
    const result = generateInsights(items, 30);
    const typeCounts = new Map<string, number>();
    for (const r of result) {
      typeCounts.set(r.tipo, (typeCounts.get(r.tipo) || 0) + 1);
    }
    for (const count of typeCounts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it("all insights have positive impacto_estimado", () => {
    const items = [
      makeItem("arroz", 10, "s1", "A"),
      makeItem("arroz", 5, "s2", "B"),
    ];
    const result = generateInsights(items, 30);
    for (const insight of result) {
      expect(insight.impacto_estimado).toBeGreaterThan(0);
    }
  });
});
