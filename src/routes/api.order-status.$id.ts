import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getPublicSupabase } from "@/lib/supabase-public.server";

const idSchema = z.string().uuid();

export const Route = createFileRoute("/api/order-status/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = idSchema.safeParse(params.id);
        if (!parsed.success) {
          return Response.json({ order: null }, { status: 400 });
        }

        try {
          const supabase = getPublicSupabase();
          // Função SECURITY DEFINER: devolve apenas os campos públicos do pedido.
          const { data, error } = await supabase.rpc("get_order_status", {
            _order_id: parsed.data,
          });

          if (error) {
            console.error("[order-status] consulta falhou:", error.message);
            return Response.json({ error: "Falha ao consultar pedido" }, { status: 500 });
          }

          const order = Array.isArray(data) ? data[0] ?? null : data ?? null;
          return Response.json({ order }, { status: order ? 200 : 404 });
        } catch (err: any) {
          console.error("[order-status] error:", err?.message ?? err);
          return Response.json({ error: "Banco não configurado" }, { status: 500 });
        }
      },
    },
  },
});
