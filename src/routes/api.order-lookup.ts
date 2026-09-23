import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getPublicSupabase } from "@/lib/supabase-public.server";

const schema = z.object({
  name: z.string().trim().min(3).max(200),
  number: z.coerce.number().int().positive().max(99999999),
});

export const Route = createFileRoute("/api/order-lookup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ order: null }, { status: 400 });
        try {
          const { data, error } = await getPublicSupabase().rpc("lookup_order" as any, {
            _name: parsed.data.name,
            _number: parsed.data.number,
          });
          if (error) throw error;
          const order = Array.isArray(data) ? data[0] ?? null : data ?? null;
          return Response.json({ order }, { status: order ? 200 : 404 });
        } catch (e: any) {
          console.error("[order-lookup]", e?.message ?? e);
          return Response.json({ error: "Falha na consulta" }, { status: 500 });
        }
      },
    },
  },
});
