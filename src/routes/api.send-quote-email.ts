// Server route portátil: envia e-mail de confirmação de orçamento via SMTP.
// Funciona em qualquer ambiente Node (Lovable Cloud + sua VPS).
//
// Variáveis de ambiente necessárias (configure no .env da sua VPS):
//   SMTP_HOST       ex: smtp.gmail.com / smtp.zoho.com / mail.seudominio.com
//   SMTP_PORT       ex: 465 (SSL) ou 587 (STARTTLS)
//   SMTP_SECURE     "true" para porta 465, "false" para 587
//   SMTP_USER       usuário SMTP (geralmente o e-mail)
//   SMTP_PASS       senha SMTP ou app password
//   SMTP_FROM       remetente, ex: "Catálogo <noreply@seudominio.com>"
//   ADMIN_EMAIL     e-mail que receberá notificação de novos orçamentos
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { z } from "zod";

const bodySchema = z.object({
  customer_name: z.string().trim().min(1).max(200),
  whatsapp: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(320),
  notes: z.string().max(1000).nullable().optional(),
  total: z.coerce.number().min(0),
  items: z.array(
    z.object({
      product_id: z.string().uuid().nullable().optional(),
      product_name: z.string().trim().min(1).max(200),
      unit_price: z.coerce.number().min(0),
      quantity: z.coerce.number().int().min(1),
    })
  ).min(1),
});

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const Route = createFileRoute("/api/send-quote-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const json = await request.json();
          const parsed = bodySchema.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "quote_id inválido" }, { status: 400 });
          }
          const quote_id = crypto.randomUUID();

          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!SUPABASE_URL || !SERVICE_KEY) {
            return Response.json(
              { error: "Supabase não configurado" },
              { status: 500 }
            );
          }

          const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

          const { error: insertQuoteError } = await supabase.from("quotes").insert({
            id: quote_id,
            customer_name: parsed.data.customer_name,
            whatsapp: parsed.data.whatsapp,
            email: parsed.data.email,
            notes: parsed.data.notes ?? null,
            total: parsed.data.total,
          });
          if (insertQuoteError) throw insertQuoteError;

          const { error: insertItemsError } = await supabase.from("quote_items").insert(
            parsed.data.items.map((item) => ({
              quote_id,
              product_id: item.product_id ?? null,
              product_name: item.product_name,
              unit_price: item.unit_price,
              quantity: item.quantity,
            }))
          );
          if (insertItemsError) throw insertItemsError;

          const { data: quote, error: qe } = await supabase
            .from("quotes")
            .select("*")
            .eq("id", quote_id)
            .single();
          if (qe || !quote) {
            return Response.json(
              { error: "Orçamento não encontrado" },
              { status: 404 }
            );
          }

          const { data: items } = await supabase
            .from("quote_items")
            .select("*")
            .eq("quote_id", quote_id);

          const SMTP_HOST = process.env.SMTP_HOST;
          const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
          const SMTP_SECURE = process.env.SMTP_SECURE === "true";
          const SMTP_USER = process.env.SMTP_USER;
          const SMTP_PASS = process.env.SMTP_PASS;
          const SMTP_FROM =
            process.env.SMTP_FROM ?? `Catálogo <${SMTP_USER ?? "noreply@example.com"}>`;
          const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "leandro_cjc@hotmail.com";

          if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
            console.warn("[send-quote-email] SMTP não configurado — pulando envio");
            return Response.json({ ok: true, skipped: true });
          }

          const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
          });

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

          await Promise.all([
            transporter.sendMail({
              from: SMTP_FROM,
              to: quote.email,
              subject: "Recebemos seu orçamento",
              html,
            }),
            transporter.sendMail({
              from: SMTP_FROM,
              to: ADMIN_EMAIL,
              subject: `Novo orçamento: ${quote.customer_name}`,
              html,
            }),
          ]);

          return Response.json({ ok: true });
        } catch (err: any) {
          console.error("[send-quote-email] error:", err);
          return Response.json(
            { error: err?.message ?? "Falha no envio" },
            { status: 500 }
          );
        }
      },
    },
  },
});
