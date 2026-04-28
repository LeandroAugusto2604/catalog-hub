// Edge Function: envia e-mail de confirmação do orçamento
// Para o cliente e para o admin via Resend.
// Configure o secret RESEND_API_KEY e ADMIN_EMAIL no painel da Cloud.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { quote_id } = await req.json();
    if (!quote_id) throw new Error("quote_id obrigatório");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: quote, error: qe } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", quote_id)
      .single();
    if (qe || !quote) throw new Error("Orçamento não encontrado");

    const { data: items } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quote_id);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "admin@catalogo.com";

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY não configurada — pulando envio");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fmt = (n: number) =>
      n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const itemsHtml = (items ?? [])
      .map(
        (i: any) =>
          `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.quantity}× ${i.product_name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(Number(i.unit_price) * i.quantity)}</td></tr>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#111">
        <h2 style="color:#ea580c;margin:0 0 16px">Orçamento recebido</h2>
        <p>Olá <strong>${quote.customer_name}</strong>, recebemos seu pedido. Em breve entraremos em contato.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml}
          <tr><td style="padding:12px 8px;font-weight:bold">Total</td><td style="padding:12px 8px;text-align:right;font-weight:bold;color:#ea580c">${fmt(Number(quote.total))}</td></tr>
        </table>
        ${quote.notes ? `<p style="background:#f5f5f5;padding:12px;border-radius:8px"><strong>Observações:</strong><br>${quote.notes}</p>` : ""}
        <p style="font-size:12px;color:#666;margin-top:24px">WhatsApp: ${quote.whatsapp} · E-mail: ${quote.email}</p>
      </div>`;

    const send = (to: string, subject: string) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Catálogo <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        }),
      });

    await Promise.all([
      send(quote.email, "Recebemos seu orçamento"),
      send(ADMIN_EMAIL, `Novo orçamento: ${quote.customer_name}`),
    ]);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
