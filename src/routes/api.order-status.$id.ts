import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const idSchema = z.string().uuid();

export const Route = createFileRoute("/api/order-status/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = idSchema.safeParse(params.id);
        if (!parsed.success) {
          return Response.json({ order: null }, { status: 400 });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
          return Response.json({ error: "Banco não configurado" }, { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("orders")
          .select("id,status,total,customer_name,created_at")
          .eq("id", parsed.data)
          .maybeSingle();

        if (error) {
          console.error("[order-status] consulta falhou:", error.message);
          return Response.json({ error: "Falha ao consultar pedido" }, { status: 500 });
        }

        return Response.json({ order: data ?? null }, { status: data ? 200 : 404 });
      },
    },
  },
});