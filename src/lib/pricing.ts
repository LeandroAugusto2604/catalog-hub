// Preço por quantidade: cada faixa vale "a partir de min_qty unidades".
export interface PriceTier {
  min_qty: number;
  price: number;
}

export function normalizeTiers(raw: unknown): PriceTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t: any) => ({ min_qty: Math.floor(Number(t?.min_qty)), price: Number(t?.price) }))
    .filter((t) => t.min_qty >= 2 && t.price > 0)
    .sort((a, b) => a.min_qty - b.min_qty);
}

export function unitPriceFor(base: number, tiers: unknown, qty: number): number {
  let price = Number(base);
  for (const t of normalizeTiers(tiers)) if (qty >= t.min_qty) price = t.price;
  return price;
}
