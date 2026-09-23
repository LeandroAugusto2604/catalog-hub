// Cálculo de frete via SuperFrete (servidor apenas).
export const ORIGIN_CEP = "08022240";

export interface ShippingOption {
  id: string;
  name: string;
  company: string;
  price: number;
  days: number;
}

export async function quoteShipping(
  toCep: string,
  items: { product_id: string; quantity: number }[]
): Promise<ShippingOption[]> {
  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) throw new Error("Frete não configurado");
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuração do banco ausente");
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ids = [...new Set(items.map((i) => i.product_id))];
  const { data: products, error } = await db
    .from("products")
    .select("id, price, weight_kg, height_cm, width_cm, length_cm")
    .eq("active", true)
    .in("id", ids);
  if (error) throw error;

  let insurance = 0;
  const pkgs = items
    .map((i) => {
      const p: any = products?.find((x: any) => x.id === i.product_id);
      if (!p) return null;
      insurance += Number(p.price) * i.quantity;
      return {
        quantity: i.quantity,
        weight: Number(p.weight_kg) || 0.3,
        height: Math.max(2, Number(p.height_cm) || 2),
        width: Math.max(11, Number(p.width_cm) || 11),
        length: Math.max(16, Number(p.length_cm) || 16),
      };
    })
    .filter(Boolean);
  if (pkgs.length === 0) return [];

  const res = await fetch("https://api.superfrete.com/api/v0/calculator", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "TudoTop (leandro_cjc@hotmail.com)",
    },
    body: JSON.stringify({
      from: { postal_code: ORIGIN_CEP },
      to: { postal_code: toCep.replace(/\D/g, "") },
      services: "1,2,17",
      options: { own_hand: false, receipt: false, insurance_value: 0, use_insurance_value: false },
      products: pkgs,
    }),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(json)) {
    console.error("[shipping] SuperFrete erro:", json);
    throw new Error("Não foi possível calcular o frete");
  }
  void insurance;
  return json
    .filter((o: any) => !o.error && o.price != null)
    .map((o: any) => ({
      id: String(o.id),
      name: String(o.name),
      company: String(o.company?.name ?? ""),
      price: Number(o.price),
      days: Number(o.delivery_time ?? o.delivery_range?.max ?? 0),
    }))
    .sort((a: ShippingOption, b: ShippingOption) => a.price - b.price);
}
