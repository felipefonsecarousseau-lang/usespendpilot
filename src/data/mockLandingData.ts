// MOCK DATA — used exclusively for landing page illustrations

export const mockPriceComparison = {
  product: "Arroz Integral 5kg",
  stores: [
    { name: "Supermercado A", price: 32.9, badge: "Mais caro", isCheapest: false },
    { name: "Supermercado B", price: 27.5, badge: "Melhor preço", isCheapest: true },
  ],
  savings: 5.4,
};

export const mockExpenseBreakdown = {
  period: "Março 2026",
  total: 3000,
  categories: [
    { name: "Supermercado", value: 1240, percent: 40, color: "hsl(var(--primary))" },
    { name: "Contas Fixas", value: 1100, percent: 35, color: "hsl(var(--accent))" },
    { name: "Transporte", value: 380, percent: 12, color: "hsl(var(--muted-foreground))" },
    { name: "Lazer", value: 280, percent: 9, color: "hsl(var(--destructive))" },
  ],
};

export const mockInsights = [
  {
    emoji: "📈",
    title: "+18% em supermercado",
    description: "Você gastou mais que o mês anterior. Dica: compare preços antes de comprar.",
  },
  {
    emoji: "🚗",
    title: "Transporte estável",
    description: "Seus gastos com transporte mantêm padrão. Ótimo controle!",
  },
  {
    emoji: "💡",
    title: "Oportunidade: Trocar supermercado",
    description: "Mudando para o Supermercado Y, você economiza até R$ 120/mês.",
  },
];
