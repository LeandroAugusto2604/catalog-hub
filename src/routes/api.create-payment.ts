// Cria o pedido e a preferência de pagamento no Mercado Pago (Pix + cartão).
//
// Variáveis de ambiente necessárias:
//   MP_ACCESS_TOKEN        Access Token da sua conta Mercado Pago
//   ORDER_WEBHOOK_TOKEN    senha interna usada pelo webhook (já preenchida no .env)
//   SITE_URL               ex: https://tudotop.dev-prod.cloud
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { z } from "zod";

const bodySchema = z.object({
  customer_name: z.string().trim().min(2).max(200),
  whatsapp: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(320),
  notes: z.string().max(1000).nullable().optional(),
  cep: z.string().trim().min(8).max(12),
  rua: z.string().trim().min(1).max(200),
  numero: z.string().trim().min(1).max(20),
  complemento: z.string().trim().max(120).nullable().optional(),
  bairro: z.string().trim().min(1).max(120),
  cidade: z.string().trim().min(1).max(120),
  uf: z.string().trim().length(2),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.coerce.number().int().min(1).max(999),
      })
    )
    .min(1)
    .max(50),
});

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const Route = createFileRoute("/api/create-payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = bodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json(
              { error: "Dados do pedido inválidos" },
              { status: 400 }
            );
          }
          const data = parsed.data;

          const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
          if (!MP_ACCESS_TOKEN) {
            return Response.json(
              { error: "Pagamento online ainda não configurado." },
              { status: 503 }
            );
          }

          const SUPABASE_URL =
            process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
          const SUPABASE_KEY =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_KEY) {
            return Response.json({ error: "Banco não configurado" }, { status: 500 });
          }
          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          // Preços vêm SEMPRE do banco, nunca do navegador.
          const ids = [...new Set(data.items.map((i) => i.product_id))];
          const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id, name, price")
            .in("id", ids)
            .eq("active", true);
          if (productsError) throw productsError;
          if (!products || products.length === 0) {
            return Response.json(
              { error: "Produtos indisponíveis" },
              { status: 400 }
            );
          }

          const lines = data.items
            .map((i) => {
              const p = products.find((x: any) => x.id === i.product_id);
              if (!p) return null;
              return {
                product_id: p.id as string,
                product_name: p.name as string,
                unit_price: Number(p.price),
                quantity: i.quantity,
              };
            })
            .filter(Boolean) as {
            product_id: string;
            product_name: string;
            unit_price: number;
            quantity: number;
          }[];

          if (lines.length === 0) {
            return Response.json(
              { error: "Produtos indisponíveis" },
              { status: 400 }
            );
          }

          const total = lines.reduce((a, l) => a + l.unit_price * l.quantity, 0);
          const order_id = crypto.randomUUID();

          const { error: orderError } = await supabase.from("orders").insert({
            id: order_id,
            customer_name: data.customer_name,
            whatsapp: data.whatsapp,
            email: data.email,
            notes: data.notes ?? null,
            cep: data.cep,
            rua: data.rua,
            numero: data.numero,
            complemento: data.complemento ?? null,
            bairro: data.bairro,
            cidade: data.cidade,
            uf: data.uf.toUpperCase(),
            total,
            status: "pendente",
          });
          if (orderError) throw orderError;

          const { error: itemsError } = await supabase.from("order_items").insert(
            lines.map((l) => ({
              order_id,
              product_id: l.product_id,
              product_name: l.product_name,
              unit_price: l.unit_price,
              quantity: l.quantity,
            }))
          );
          if (itemsError) throw itemsError;

          const origin = new URL(request.url).origin;
          const siteUrl = (process.env.SITE_URL ?? origin).replace(/\/$/, "");
          const webhookToken = process.env.ORDER_WEBHOOK_TOKEN ?? "";

          const prefBody = {
            items: lines.map((l) => ({
              id: l.product_id,
              title: l.product_name.slice(0, 250),
              quantity: l.quantity,
              unit_price: Number(l.unit_price.toFixed(2)),
              currency_id: "BRL",
            })),
            payer: {
              name: data.customer_name,
              email: data.email,
              address: {
                zip_code: data.cep.replace(/\D/g, ""),
                street_name: data.rua,
                street_number: data.numero,
              },
            },
            external_reference: order_id,
            statement_descriptor: "TUDOTOP",
            back_urls: {
              success: `${siteUrl}/pedido/${order_id}`,
              pending: `${siteUrl}/pedido/${order_id}`,
              failure: `${siteUrl}/pedido/${order_id}`,
            },
            auto_return: "approved",
            notification_url: `${siteUrl}/api/public/mercadopago-webhook?token=${encodeURIComponent(webhookToken)}`,
          };

          const mpRes = await fetch(
            "https://api.mercadopago.com/checkout/preferences",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(prefBody),
            }
          );
          const mpJson: any = await mpRes.json().catch(() => null);
          if (!mpRes.ok || !mpJson?.id) {
            console.error("[create-payment] Mercado Pago erro:", mpJson);
            return Response.json(
              { error: "Não foi possível iniciar o pagamento. Tente novamente." },
              { status: 502 }
            );
          }

          await supabase
            .from("orders")
            .update({ mp_preference_id: mpJson.id })
            .eq("id", order_id)
            .then(({ error }) => {
              // Atualização só funciona com service role; ignoramos silenciosamente.
              if (error) console.warn("[create-payment] preference_id não salvo:", error.message);
            });

          // E-mails informando o pedido criado (aguardando pagamento)
          try {
            const SMTP_HOST = process.env.SMTP_HOST;
            const SMTP_USER = process.env.SMTP_USER;
            const SMTP_PASS = process.env.SMTP_PASS;
            if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
              const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: Number(process.env.SMTP_PORT ?? 587),
                secure: process.env.SMTP_SECURE === "true",
                auth: { user: SMTP_USER, pass: SMTP_PASS },
              });
              const SMTP_FROM = process.env.SMTP_FROM ?? `Catálogo <${SMTP_USER}>`;
              const ADMIN_EMAIL =
                process.env.ADMIN_EMAIL ?? "leandro_cjc@hotmail.com";

              const itemsHtml = lines
                .map(
                  (l) =>
                    `<tr><td style="padding:8px;border-bottom:1px solid #eee">${l.quantity}× ${l.product_name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${fmt(l.unit_price * l.quantity)}</td></tr>`
                )
                .join("");
              const address = `${data.rua}, ${data.numero}${data.complemento ? ` - ${data.complemento}` : ""}<br>${data.bairro} — ${data.cidade}/${data.uf.toUpperCase()}<br>CEP ${data.cep}`;
              const table = `<table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml}<tr><td style="padding:12px 8px;font-weight:bold">Total</td><td style="padding:12px 8px;text-align:right;font-weight:bold;color:#ea580c">${fmt(total)}</td></tr></table>`;
              const wrap = (inner: string) =>
                `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#111">${inner}</div>`;

              await Promise.allSettled([
                transporter.sendMail({
                  from: SMTP_FROM,
                  to: data.email,
                  replyTo: ADMIN_EMAIL,
                  subject: "Seu pedido foi registrado — aguardando pagamento",
                  html: wrap(`
                    <h2 style="color:#ea580c;margin:0 0 16px">Pedido registrado</h2>
                    <p>Olá <strong>${data.customer_name}</strong>, recebemos seu pedido. Assim que o pagamento for confirmado avisaremos por e-mail.</p>
                    ${table}
                    <h3 style="font-size:15px;margin:24px 0 8px">Entrega</h3>
                    <p style="font-size:14px;color:#444">${address}</p>
                    <p style="font-size:12px;color:#666;margin-top:24px">Pedido nº ${order_id}</p>
                  `),
                }),
                transporter.sendMail({
                  from: SMTP_FROM,
                  to: ADMIN_EMAIL,
                  replyTo: data.email,
                  subject: `Novo pedido (aguardando pagamento): ${data.customer_name} — ${fmt(total)}`,
                  html: wrap(`
                    <h2 style="color:#ea580c;margin:0 0 16px">Novo pedido no site</h2>
                    <table style="width:100%;border-collapse:collapse;background:#fff7ed;border-radius:8px">
                      <tr><td style="padding:8px 12px;color:#666">Cliente</td><td style="padding:8px 12px;font-weight:bold">${data.customer_name}</td></tr>
                      <tr><td style="padding:8px 12px;color:#666">WhatsApp</td><td style="padding:8px 12px;font-weight:bold">${data.whatsapp}</td></tr>
                      <tr><td style="padding:8px 12px;color:#666">E-mail</td><td style="padding:8px 12px;font-weight:bold">${data.email}</td></tr>
                    </table>
                    ${table}
                    <h3 style="font-size:15px;margin:24px 0 8px">Endereço de entrega</h3>
                    <p style="font-size:14px;color:#444">${address}</p>
                    ${data.notes ? `<p style="background:#f5f5f5;padding:12px;border-radius:8px"><strong>Observações:</strong><br>${data.notes}</p>` : ""}
                    <p style="font-size:12px;color:#666;margin-top:24px">Pedido nº ${order_id}</p>
                  `),
                }),
              ]);
            }
          } catch (mailErr) {
            console.error("[create-payment] falha no e-mail:", mailErr);
          }

          return Response.json({
            order_id,
            checkout_url: mpJson.init_point ?? mpJson.sandbox_init_point,
          });
        } catch (err: any) {
          console.error("[create-payment] error:", err);
          return Response.json(
            { error: err?.message ?? "Falha ao iniciar pagamento" },
            { status: 500 }
          );
        }
      },
    },
  },
});
