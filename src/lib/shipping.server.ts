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
  const { getPublicSupabase } = await import("@/lib/supabase-public.server");
  const db = getPublicSupabase();
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

// Remetente (etiqueta SuperFrete)
export const SENDER = {
  name: "Leandro Augusto da Silva",
  document: "39602836873",
  address: "Rua Osvaldo Jose Barbosa",
  number: "186",
  complement: "",
  district: "Sao Miguel Paulista",
  city: "Sao Paulo",
  state_abbr: "SP",
  postal_code: ORIGIN_CEP,
  email: "leandro_cjc@hotmail.com",
  phone: "11937460073",
};

// Cria o envio no carrinho do SuperFrete (aparece no painel para pagar/gerar etiqueta).
// Recebe o pedido e os itens já lidos do banco (função protegida por token).
export async function createSuperFreteOrder(
  order: any,
  items: any[],
  recipientDocument: string
): Promise<string | null> {
  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) return null;
  if (!order || order.superfrete_id || !order.shipping_service_id) return order?.superfrete_id ?? null;
  const { getPublicSupabase } = await import("@/lib/supabase-public.server");
  const db = getPublicSupabase();
  const ids = (items ?? []).map((i: any) => i.product_id).filter(Boolean);
  const { data: prods } = await db
    .from("products")
    .select("id, weight_kg, height_cm, width_cm, length_cm")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  let weight = 0, height = 0, width = 11, length = 16, value = 0;
  for (const it of items ?? []) {
    const p: any = prods?.find((x: any) => x.id === it.product_id) ?? {};
    const q = Number(it.quantity);
    weight += (Number(p.weight_kg) || 0.3) * q;
    height += Math.max(2, Number(p.height_cm) || 2) * q;
    width = Math.max(width, Number(p.width_cm) || 11);
    length = Math.max(length, Number(p.length_cm) || 16);
    value += Number(it.unit_price) * q;
  }
  const body = {
    from: SENDER,
    to: {
      name: String(order.customer_name).slice(0, 50),
      address: String(order.rua).slice(0, 50),
      number: String(order.numero ?? "").slice(0, 10),
      complement: String(order.complemento ?? "").slice(0, 20),
      district: String(order.bairro || "NA").slice(0, 50),
      city: String(order.cidade).slice(0, 50),
      state_abbr: String(order.uf).toUpperCase(),
      postal_code: String(order.cep).replace(/\D/g, ""),
      email: order.email,
      phone: String(order.whatsapp ?? "").replace(/\D/g, "").slice(-11),
      document: recipientDocument.replace(/\D/g, ""),
    },
    service: Number(order.shipping_service_id),
    products: (items ?? []).map((i: any) => ({
      name: i.product_name,
      quantity: Number(i.quantity),
      unitary_value: Number(i.unit_price),
    })),
    volumes: { height, width, length, weight },
    options: { insurance_value: 0, receipt: false, own_hand: false, non_commercial: true },
    platform: "TudoTop",
    tag: String(order.id),
  };
  const res = await fetch("https://api.superfrete.com/api/v0/cart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "TudoTop (leandro_cjc@hotmail.com)",
    },
    body: JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json?.id) {
    console.error("[superfrete] criar envio falhou:", res.status, json);
    throw new Error(`SuperFrete recusou o envio (${res.status})`);
  }
  return String(json.id) || null;
}
