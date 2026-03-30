/**
 * Unified human-readable labels for all expense categories used in the app.
 * Use: CATEGORY_LABELS[category] ?? category
 */
export const CATEGORY_LABELS: Record<string, string> = {
  // Manual expense categories
  alimentacao: "Alimentação",
  transporte: "Transporte",
  lazer: "Lazer",
  saude: "Saúde",
  educacao: "Educação",
  streaming: "Streaming",
  compras: "Compras",
  mercado: "Supermercado",
  moradia: "Moradia",
  outros: "Outros",

  // Receipt item categories
  higiene: "Higiene",
  limpeza: "Limpeza",
  bebidas: "Bebidas",
  padaria: "Padaria",
  hortifruti: "Hortifruti",
  supermercado: "Supermercado",

  // Fixed expense categories
  utilidades: "Utilidades",
  internet: "Internet",
  telefone: "Telefone",
  seguro: "Seguro",
  contas: "Contas",
  "contas fixas": "Contas Fixas",
};
