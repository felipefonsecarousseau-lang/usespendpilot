// Heuristic-based product normalizer — no external AI needed.
// Extracts base name, quantity, unit, and pricePerUnit from product names.

export interface NormalizedProduct {
  baseName: string;            // e.g. "Arroz" (display-friendly)
  baseNameClean: string;       // e.g. "arroz" (accent-free, lowercase, for grouping)
  quantity: number | null;     // e.g. 5
  unit: string | null;         // e.g. "kg"
  pricePerUnit: number | null; // e.g. R$/kg
}

/**
 * Remove diacritics/accents from a string.
 * "Café" → "Cafe", "Açúcar" → "Acucar"
 */
function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Produce a clean key for comparison: no accents, lowercase,
 * no special chars, collapsed whitespace, no noise words.
 */
function cleanForComparison(baseName: string): string {
  let clean = removeAccents(baseName).toLowerCase();
  // Remove special characters except spaces
  clean = clean.replace(/[^a-z0-9\s]/g, " ");
  // Remove noise words (already stripped in extractBaseName, but ensure)
  clean = clean.replace(/\b(tipo|tp|t\.|marca|extra|especial|premium|integral|tradicional|branco|branca|light|zero|diet)\b/g, "");
  // Collapse whitespace
  clean = clean.replace(/\s{2,}/g, " ").trim();
  // Basic plural → singular (Portuguese simple rules)
  clean = clean.replace(/\b(\w{3,})s\b/g, "$1");
  return clean;
}

// Unit aliases → canonical form
const UNIT_MAP: Record<string, string> = {
  kg: "kg", kgs: "kg", quilo: "kg", quilos: "kg",
  g: "g", gr: "g", grs: "g", gramas: "g", grama: "g",
  l: "L", lt: "L", lts: "L", litro: "L", litros: "L",
  ml: "mL", mililitro: "mL", mililitros: "mL",
  un: "un", und: "un", unid: "un", unidade: "un", unidades: "un",
  pct: "pct", pacote: "pct", pacotes: "pct",
  cx: "cx", caixa: "cx", caixas: "cx",
  dz: "dz", duzia: "dz", duzias: "dz",
  pc: "un", pç: "un", peça: "un", peças: "un",
};

// Patterns that capture quantity + unit from product names
// e.g. "Arroz 5kg", "Leite 1L", "Açúcar 1,5 kg"
const QTY_UNIT_PATTERNS = [
  // "5kg", "1,5 kg", "500g", "1L", "200ml"
  /(\d+[.,]?\d*)\s*(kg|kgs|g|gr|grs|gramas?|l|lt|lts|litros?|ml|mililitros?|un|und|unid|unidades?|pct|pacotes?|cx|caixas?|dz|duzias?)\b/i,
  // "5 x 200g", "12x1L"
  /(\d+)\s*[xX×]\s*(\d+[.,]?\d*)\s*(kg|g|gr|l|lt|ml|un)\b/i,
];

// Words to strip from product names for base name extraction
const NOISE_WORDS = /\b(tipo\s*\d+|tp\s*\d+|t\.\d+|marca\s+\w+|c\/|s\/|pct|pq|gd|md|extra|especial|premium|integral|tradicional|branco|branca|light|zero|diet|sem\s+\w+)\b/gi;
const SIZE_PATTERN = /\d+[.,]?\d*\s*(kg|kgs|g|gr|grs|gramas?|l|lt|lts|litros?|ml|mililitros?|un|und|unid|unidades?|pct|pacotes?|cx|caixas?|dz|duzias?)\b/gi;

function canonicalUnit(raw: string): string {
  return UNIT_MAP[raw.toLowerCase()] || raw.toLowerCase();
}

function parseQuantityUnit(name: string): { quantity: number | null; unit: string | null } {
  // Try multi-pack pattern first: "12x1L" → 12 * 1 = 12L
  const multiMatch = name.match(QTY_UNIT_PATTERNS[1]);
  if (multiMatch) {
    const count = parseInt(multiMatch[1]);
    const perItem = parseFloat(multiMatch[2].replace(",", "."));
    const unit = canonicalUnit(multiMatch[3]);
    return { quantity: Math.round(count * perItem * 1000) / 1000, unit };
  }

  // Standard pattern: "5kg", "1,5 L"
  const stdMatch = name.match(QTY_UNIT_PATTERNS[0]);
  if (stdMatch) {
    const qty = parseFloat(stdMatch[1].replace(",", "."));
    const unit = canonicalUnit(stdMatch[2]);
    return { quantity: qty, unit };
  }

  return { quantity: null, unit: null };
}

function extractBaseName(name: string): string {
  let base = name
    .replace(SIZE_PATTERN, "")   // remove "5kg", "200ml" etc.
    .replace(NOISE_WORDS, "")     // remove noise words
    .replace(/\s{2,}/g, " ")     // collapse whitespace
    .trim();

  // Capitalize first letter of each word
  base = base
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return base || name; // fallback to original
}

/**
 * Normalize a product name into structured data.
 * Pure heuristics — no external API calls.
 */
export function normalizeProduct(
  rawName: string,
  itemQuantity: number,
  itemPriceTotal: number
): NormalizedProduct {
  const { quantity: parsedQty, unit: parsedUnit } = parseQuantityUnit(rawName);
  const baseName = extractBaseName(rawName);

  // Calculate pricePerUnit if we have enough info
  let pricePerUnit: number | null = null;

  if (parsedQty && parsedQty > 0 && itemPriceTotal > 0) {
    // Convert to base unit for consistent comparison
    let effectiveQty = parsedQty;
    let effectiveUnit = parsedUnit;

    // Normalize g → kg, mL → L for pricePerUnit
    if (parsedUnit === "g" && parsedQty >= 1) {
      effectiveQty = parsedQty / 1000;
      effectiveUnit = "kg";
    } else if (parsedUnit === "mL" && parsedQty >= 1) {
      effectiveQty = parsedQty / 1000;
      effectiveUnit = "L";
    }

    // Price per base unit (per item, not per receipt line)
    const pricePerItem = itemPriceTotal / itemQuantity;
    pricePerUnit = Math.round((pricePerItem / effectiveQty) * 100) / 100;

    return { baseName, quantity: parsedQty, unit: effectiveUnit, pricePerUnit };
  }

  return { baseName, quantity: parsedQty, unit: parsedUnit, pricePerUnit };
}

/**
 * Format a unit price for display.
 */
export function formatPricePerUnit(price: number, unit: string | null): string {
  const formatted = `R$ ${price.toFixed(2).replace(".", ",")}`;
  if (!unit) return formatted;
  return `${formatted}/${unit}`;
}

/**
 * Group products by normalized base name for comparison.
 */
export function groupByBaseName<T extends { baseName: string }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.baseName.toLowerCase();
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
