// MOCK DATA — used exclusively for landing page illustrations

export const mockPriceComparison = {
  stores: [
    { name: "Mercado do Bairro", badge: "Mais caro", isCheapest: false },
    { name: "Supermercado Central", badge: "Melhor preço", isCheapest: true },
  ],
  products: [
    { name: "Arroz 5kg",          prices: [32.90, 27.50] },
    { name: "Feijão Carioca 1kg", prices: [8.90,  7.20]  },
    { name: "Leite Integral 1L",  prices: [5.49,  4.79]  },
    { name: "Óleo de Soja 900ml", prices: [7.99,  6.49]  },
  ],
  savings: 8.30,
};

export const mockExpenseBreakdown = {
  period: "Março 2026",
  total: 3200,
  categories: [
    { name: "Supermercado",  value: 1280, percent: 40, color: "hsl(var(--primary))" },
    { name: "Contas Fixas",  value: 1120, percent: 35, color: "hsl(var(--accent))" },
    { name: "Transporte",    value: 384,  percent: 12, color: "hsl(var(--muted-foreground))" },
    { name: "Lazer",         value: 288,  percent: 9,  color: "hsl(var(--destructive))" },
    { name: "Outros",        value: 128,  percent: 4,  color: "hsl(215 20% 40%)" },
  ],
};

export const mockInsights = [
  {
    emoji: "🏪",
    title: "Supermercado Central é mais barato",
    description: "Para os produtos que você costuma comprar, o Supermercado Central é em média 12% mais barato que o Mercado do Bairro.",
  },
  {
    emoji: "📉",
    title: "Arroz subiu 8% este mês",
    description: "O preço do Arroz 5kg aumentou em relação ao mês passado nos dois mercados que você frequenta.",
  },
  {
    emoji: "💡",
    title: "Economia potencial de R$ 99/mês",
    description: "Comprando sempre no mercado mais barato para cada produto, você economizaria R$ 99,00 por mês.",
  },
];
