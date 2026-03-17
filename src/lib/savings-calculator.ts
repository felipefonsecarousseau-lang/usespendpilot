import { supabase } from "@/integrations/supabase/client";

export interface UserSavings {
  economia_total: number;
  economia_mensal_estimada: number;
}

export async function calculateUserSavings(): Promise<UserSavings> {
  // Fetch all receipt items with store info
  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, data_compra, store_id, stores(nome), receipt_items(nome_normalizado, preco_unitario, preco_total, quantidade)");

  if (!receipts?.length) return { economia_total: 0, economia_mensal_estimada: 0 };

  // Build product-store price map
  const productPrices = new Map<string, { min: number; prices: { avg: number; count: number }[] }>();

  for (const receipt of receipts) {
    const items = (receipt as any).receipt_items ?? [];
    for (const item of items) {
      const key = item.nome_normalizado;
      if (!productPrices.has(key)) {
        productPrices.set(key, { min: Infinity, prices: [] });
      }
      const entry = productPrices.get(key)!;
      const unitPrice = Number(item.preco_unitario);
      entry.prices.push({ avg: unitPrice, count: Number(item.quantidade) || 1 });
      if (unitPrice < entry.min) entry.min = unitPrice;
    }
  }

  // Calculate total potential savings
  let totalSavings = 0;
  productPrices.forEach(({ min, prices }) => {
    if (prices.length < 2) return;
    for (const p of prices) {
      const diff = p.avg - min;
      if (diff > 0) totalSavings += diff * p.count;
    }
  });

  // Estimate months of data
  const dates = receipts.map(r => new Date(r.data_compra).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const months = Math.max((maxDate - minDate) / (1000 * 60 * 60 * 24 * 30), 1);

  return {
    economia_total: Math.round(totalSavings * 100) / 100,
    economia_mensal_estimada: Math.round((totalSavings / months) * 100) / 100,
  };
}
