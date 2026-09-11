// Webhook do Mercado Pago: confirma o status real do pagamento e atualiza o pedido.
// Configure no painel do Mercado Pago (Notificações / Webhooks):
//   https://SEU-DOMINIO/api/public/mercadopago-webhook?token=ORDER_WEBHOOK_TOKEN
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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

          const SUPABASE_URL =
            process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
          const SUPABASE_KEY =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_KEY) return new Response("ok");

          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const { error } = await supabase.rpc("confirm_order_payment", {
            _order_id: orderId,
            _status: status,
            _mp_payment_id: String(paymentId),
            _payment_method: method,
            _token: expected,
          });
          if (error) console.error("[mp-webhook] update falhou:", error.message);

          if (status === "pago") {
            const SMTP_HOST = process.env.SMTP_HOST;
            const SMTP_USER = process.env.SMTP_USER;
            const SMTP_PASS = process.env.SMTP_PASS;
            const ADMIN_EMAIL =
              process.env.ADMIN_EMAIL ?? "leandro_cjc@hotmail.com";
            const customerEmail = payment?.payer?.email;
            const amount = Number(payment?.transaction_amount ?? 0);

            if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
              const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: Number(process.env.SMTP_PORT ?? 587),
                secure: process.env.SMTP_SECURE === "true",
                auth: { user: SMTP_USER, pass: SMTP_PASS },
              });
              const SMTP_FROM =
                process.env.SMTP_FROM ?? `Catálogo <${SMTP_USER}>`;
              const wrap = (inner: string) =>
                `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#111">${inner}</div>`;

              await Promise.allSettled([
                customerEmail
                  ? transporter.sendMail({
                      from: SMTP_FROM,
                      to: customerEmail,
                      replyTo: ADMIN_EMAIL,
                      subject: "Pagamento confirmado — seu pedido está a caminho",
                      html: wrap(`
                        <h2 style="color:#ea580c;margin:0 0 16px">Pagamento confirmado</h2>
                        <p>Recebemos seu pagamento de <strong>${fmt(amount)}</strong>. Já estamos preparando o envio e entraremos em contato com os detalhes da entrega.</p>
                        <p style="font-size:12px;color:#666;margin-top:24px">Pedido nº ${orderId}</p>
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
                    <p>Veja o endereço de entrega e os itens no painel, em Pedidos pagos.</p>
                    <p style="font-size:12px;color:#666;margin-top:24px">Pedido nº ${orderId}</p>
                  `),
                }),
              ]);
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
