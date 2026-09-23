// Webhook do Mercado Pago: confirma o status real do pagamento e atualiza o pedido.
// Configure no painel do Mercado Pago (Notificações / Webhooks):
//   https://SEU-DOMINIO/api/public/mercadopago-webhook?token=ORDER_WEBHOOK_TOKEN
import { createFileRoute } from "@tanstack/react-router";
import nodemailer from "nodemailer";
import { getPublicSupabase } from "@/lib/supabase-public.server";
import { businessDaysDate } from "@/lib/delivery";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusMap: Record<string, string> = {
  approved: "pago",
  authorized: "pago",
  pending: "pendente",
  in_process: "pendente",
  in_mediation: "pendente",
  rejected: "recusado",
  cancelled: "cancelado",
  refunded: "devolvido",
  charged_back: "devolvido",
};

export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token") ?? "";
        const expected = process.env.ORDER_WEBHOOK_TOKEN ?? "";
        if (!expected || token !== expected) {
          return new Response("unauthorized", { status: 401 });
        }

        const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
        if (!MP_ACCESS_TOKEN) return new Response("not configured", { status: 503 });

        let payload: any = null;
        try {
          payload = await request.json();
        } catch {
          return new Response("ok");
        }

        const type = payload?.type ?? payload?.topic;
        const paymentId = String(payload?.data?.id ?? payload?.resource ?? "").replace(
          /^.*\//,
          ""
        );
        if (type !== "payment" || !paymentId) return new Response("ok");

        try {
          const res = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
          );
          const payment: any = await res.json();
          if (!res.ok) {
            console.error("[mp-webhook] consulta falhou:", payment);
            return new Response("ok");
          }

          const orderId: string | undefined = payment?.external_reference;
          const status = statusMap[payment?.status] ?? "pendente";
          const method =
            payment?.payment_type_id === "credit_card"
              ? "cartao"
              : payment?.payment_method_id === "pix"
                ? "pix"
                : (payment?.payment_type_id ?? null);
          if (!orderId) return new Response("ok");

          const supabase = getPublicSupabase();

          const { error } = await supabase.rpc("confirm_order_payment", {
            _order_id: orderId,
            _status: status,
            _mp_payment_id: String(paymentId),
            _payment_method: method,
            _token: expected,
          });
          if (error) console.error("[mp-webhook] update falhou:", error.message);

          if (status === "pago") {
            let shipData: any = null;
            try {
              // Dados do pedido via função protegida por token no banco.
              const r = await supabase.rpc(
                "get_order_for_shipping",
                { _token: expected, _order_id: orderId }
              );
              shipData = r.data;
              const claim = shipData?.order && !shipData.order.superfrete_id
                ? await supabase.rpc("claim_superfrete" as any, { _token: expected, _order_id: orderId })
                : null;
              if (claim?.data === true) {
                try {
                  const { createSuperFreteOrder } = await import("@/lib/shipping.server");
                  const sfId = await createSuperFreteOrder(
                    { ...shipData.order, superfrete_id: null },
                    shipData.items ?? [],
                    String(payment?.payer?.identification?.number ?? "")
                  );
                  if (!sfId) throw new Error("sem id");
                  await supabase.rpc("set_superfrete_id", {
                    _token: expected,
                    _order_id: orderId,
                    _sf_id: sfId,
                  });
                } catch (e) {
                  await supabase.rpc("release_superfrete" as any, { _token: expected, _order_id: orderId });
                  throw e;
                }
              }
            } catch (e) {
              console.error("[mp-webhook] superfrete:", e);
            }
            const SMTP_HOST = process.env.SMTP_HOST;
            const SMTP_USER = process.env.SMTP_USER;
            const SMTP_PASS = process.env.SMTP_PASS;
            const ADMIN_EMAIL =
              process.env.ADMIN_EMAIL ?? "leandro_cjc@hotmail.com";
            const customerEmail = shipData?.order?.email || payment?.payer?.email;
            const days = Number(shipData?.order?.shipping_days ?? 0);
            const amount = Number(payment?.transaction_amount ?? 0);
            const deliveryText = days > 0 ? businessDaysDate(days) : "";
            const o: any = shipData?.order ?? {};
            const its: any[] = shipData?.items ?? [];
            const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
            const itemsTable = its.length
              ? `<table style="width:100%;border-collapse:collapse;margin:16px 0">${its.map((i) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${Number(i.quantity)}× ${esc(i.product_name)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(Number(i.unit_price) * Number(i.quantity))}</td></tr>`).join("")}<tr><td style="padding:8px;border-bottom:1px solid #eee">Frete ${esc(o.shipping_service ?? "")}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#16a34a;font-weight:bold">Grátis</td></tr><tr><td style="padding:12px 8px;font-weight:bold">Total pago</td><td style="padding:12px 8px;text-align:right;font-weight:bold;color:#ea580c">${fmt(amount)}</td></tr></table>`
              : "";
            const addressHtml = o.rua
              ? `<h3 style="font-size:15px;margin:24px 0 8px">Endereço de entrega</h3><p style="font-size:14px;color:#444">${esc(o.rua)}, ${esc(o.numero)}${o.complemento ? ` - ${esc(o.complemento)}` : ""}<br>${esc(o.bairro)} — ${esc(o.cidade)}/${esc(String(o.uf ?? "").toUpperCase())}<br>CEP ${esc(o.cep)}</p>`
              : "";
            const firstName = String(shipData?.order?.customer_name ?? "").split(" ")[0];

            if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
              const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: Number(process.env.SMTP_PORT ?? 587),
                secure:
                  process.env.SMTP_SECURE === "true" ||
                  Number(process.env.SMTP_PORT ?? 587) === 465,
                auth: { user: SMTP_USER, pass: SMTP_PASS },
              });
              const SMTP_FROM =
                process.env.SMTP_FROM ?? `Catálogo <${SMTP_USER}>`;
              const wrap = (inner: string) =>
                `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#111">${inner}</div>`;

              const results = await Promise.allSettled([
                customerEmail
                  ? transporter.sendMail({
                      from: SMTP_FROM,
                      to: customerEmail,
                      replyTo: ADMIN_EMAIL,
                      subject: "Pagamento confirmado — seu pedido está a caminho",
                      html: wrap(`
                        <h2 style="color:#ea580c;margin:0 0 16px">Pagamento confirmado</h2>
                        <p>${firstName ? `Olá, ${firstName}! ` : ""}Recebemos seu pagamento de <strong>${fmt(amount)}</strong>. Já estamos preparando o envio.</p>
                        ${deliveryText ? `<p>Frete: <strong>grátis</strong>${shipData?.order?.shipping_service ? ` (${shipData.order.shipping_service})` : ""}<br>Previsão de entrega: <strong>${deliveryText}</strong></p>` : ""}
                        ${itemsTable}
                        ${addressHtml}
                        <p>Dúvidas? Fale com a gente no WhatsApp (11) 93746-0073.</p>
                        <p style="font-size:12px;color:#666;margin-top:24px">Pedido nº <strong>${shipData?.order?.order_number ?? orderId}</strong> — consulte o status em ${process.env.SITE_URL ?? "https://tudotop.dev-prod.cloud"}/meu-pedido</p>
                      `),
                    })
                  : Promise.resolve(),
                transporter.sendMail({
                  from: SMTP_FROM,
                  to: ADMIN_EMAIL,
                  subject: `Pagamento aprovado — ${fmt(amount)}`,
                  html: wrap(`
                    <h2 style="color:#ea580c;margin:0 0 16px">Pagamento aprovado</h2>
                    <p>Forma: <strong>${method ?? "-"}</strong><br>Valor: <strong>${fmt(amount)}</strong></p>
                    <p>Cliente: <strong>${esc(o.customer_name)}</strong> — WhatsApp ${esc(o.whatsapp)}</p>
                    ${itemsTable}
                    ${addressHtml}
                    ${deliveryText ? `<p>Previsão de entrega: <strong>${deliveryText}</strong></p>` : ""}
                    <p style="font-size:12px;color:#666;margin-top:24px">Pedido nº <strong>${shipData?.order?.order_number ?? orderId}</strong> — consulte o status em ${process.env.SITE_URL ?? "https://tudotop.dev-prod.cloud"}/meu-pedido</p>
                  `),
                }),
              ]);
              results.forEach((r) => {
                if (r.status === "rejected") console.error("[mp-webhook] email:", r.reason);
              });
            }
          }

          return new Response("ok");
        } catch (err) {
          console.error("[mp-webhook] error:", err);
          return new Response("ok");
        }
      },
      GET: async () => new Response("ok"),
    },
  },
});
