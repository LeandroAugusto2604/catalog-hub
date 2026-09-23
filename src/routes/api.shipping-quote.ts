import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { quoteShipping } from "@/lib/shipping.server";

const schema = z.object({
  cep: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 8, "CEP inválido"),
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(999) }))
    .min(1)
    .max(50),
});

export const Route = createFileRoute("/api/shipping-quote")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = schema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "CEP inválido" }, { status: 400 });
        try {
          const options = await quoteShipping(parsed.data.cep, parsed.data.items);
          return Response.json({ options });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "Falha no frete" }, { status: 502 });
        }
      },
    },
  },
});
