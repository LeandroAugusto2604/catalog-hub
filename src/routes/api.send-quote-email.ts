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

          const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
          // A chave de serviço é opcional: sem ela usamos a chave pública, que
          // tem permissão apenas para CRIAR orçamentos (nunca para ler).
          const SUPABASE_KEY =
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (!SUPABASE_URL || !SUPABASE_KEY) {
            return Response.json(
              { error: "Supabase não configurado" },
              { status: 500 }
            );
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

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

          // Usamos os dados já validados (não relemos o banco, pois a leitura
          // de orçamentos é restrita ao administrador).
          const quote = parsed.data;
          const items = parsed.data.items;


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

          const itemsTable = `
            <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml}
              <tr><td style="padding:12px 8px;font-weight:bold">Total</td><td style="padding:12px 8px;text-align:right;font-weight:bold;color:#ea580c">${fmt(Number(quote.total))}</td></tr>
            </table>`;

          const notesBlock = quote.notes
            ? `<p style="background:#f5f5f5;padding:12px;border-radius:8px"><strong>Observações:</strong><br>${quote.notes}</p>`
            : "";

          const wrap = (inner: string) => `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#111">${inner}</div>`;

          // E-mail para o cliente: confirmação
          const customerHtml = wrap(`
            <h2 style="color:#ea580c;margin:0 0 16px">Recebemos seu orçamento</h2>
            <p>Olá <strong>${quote.customer_name}</strong>, obrigado pelo seu pedido! Em breve entraremos em contato pelo WhatsApp ${quote.whatsapp}.</p>
            <h3 style="margin:24px 0 0;font-size:15px">Itens solicitados</h3>
            ${itemsTable}
            ${notesBlock}
            <p style="font-size:12px;color:#666;margin-top:24px">Este é um resumo do seu pedido de orçamento. Se algum dado estiver errado, responda a este e-mail.</p>
          `);

          // E-mail para o vendedor: dados de contato em destaque
          const adminHtml = wrap(`
            <h2 style="color:#ea580c;margin:0 0 16px">Novo orçamento recebido</h2>
            <table style="width:100%;border-collapse:collapse;background:#fff7ed;border-radius:8px">
              <tr><td style="padding:8px 12px;color:#666">Cliente</td><td style="padding:8px 12px;font-weight:bold">${quote.customer_name}</td></tr>
              <tr><td style="padding:8px 12px;color:#666">WhatsApp</td><td style="padding:8px 12px;font-weight:bold">${quote.whatsapp}</td></tr>
              <tr><td style="padding:8px 12px;color:#666">E-mail</td><td style="padding:8px 12px;font-weight:bold">${quote.email}</td></tr>
            </table>
            <h3 style="margin:24px 0 0;font-size:15px">Itens</h3>
            ${itemsTable}
            ${notesBlock}
            <p style="font-size:12px;color:#666;margin-top:24px">Pedido nº ${quote_id}</p>
          `);

          const results = await Promise.allSettled([
            transporter.sendMail({
              from: SMTP_FROM,
              to: quote.email,
              subject: "Recebemos seu orçamento",
              html: customerHtml,
              replyTo: ADMIN_EMAIL,
            }),
            transporter.sendMail({
              from: SMTP_FROM,
              to: ADMIN_EMAIL,
              subject: `Novo orçamento: ${quote.customer_name} — ${fmt(Number(quote.total))}`,
              html: adminHtml,
              replyTo: quote.email,
            }),
          ]);

          results.forEach((r, i) => {
            if (r.status === "rejected") {
              console.error(
                `[send-quote-email] falha no envio (${i === 0 ? "cliente" : "vendedor"}):`,
                r.reason
              );
            }
          });

          // O pedido já está salvo: nunca falhamos por causa do e-mail.
          return Response.json({
            ok: true,
            emailCustomer: results[0].status === "fulfilled",
            emailAdmin: results[1].status === "fulfilled",
          });
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
