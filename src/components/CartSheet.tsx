import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Minus, Plus, ShoppingBag, MessageCircle } from "lucide-react";
import { useCart, formatBRL } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const STORE_WHATSAPP = "5511973460073";

const formSchema = z.object({
  customer_name: z.string().trim().min(2, "Nome muito curto").max(200),
  whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(40),
  email: z.string().trim().email("E-mail inválido").max(320),
  notes: z.string().max(1000).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CartSheet({ open, onOpenChange }: Props) {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const total = useCart((s) => s.items.reduce((a, i) => a + i.price * i.quantity, 0));

  const [form, setForm] = useState({ customer_name: "", whatsapp: "", email: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Adicione produtos ao orçamento");
      return;
    }
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const quoteId = crypto.randomUUID();
      const { error: qErr } = await supabase.from("quotes").insert({
        id: quoteId,
        customer_name: parsed.data.customer_name,
        whatsapp: parsed.data.whatsapp,
        email: parsed.data.email,
        notes: parsed.data.notes ?? null,
        total,
      });
      if (qErr) throw qErr;

      const { error: iErr } = await supabase.from("quote_items").insert(
        items.map((i) => ({
          quote_id: quoteId,
          product_id: i.id,
          product_name: i.name,
          unit_price: i.price,
          quantity: i.quantity,
        }))
      );
      if (iErr) throw iErr;

      // Dispara envio de e-mail via server route (portátil para VPS)
      fetch("/api/send-quote-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      }).catch((e) => console.warn("email send failed", e));

      toast.success("Orçamento enviado! Entraremos em contato em breve.");
      clear();
      setForm({ customer_name: "", whatsapp: "", email: "", notes: "" });
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Falha ao enviar orçamento");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Seu Orçamento
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Carrinho vazio. Adicione produtos do catálogo.
            </div>
          ) : (
            items.map((i) => (
              <div key={i.id} className="flex gap-3 card-elevated rounded-xl p-3">
                <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {i.image_url && (
                    <img src={i.image_url} alt={i.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{i.name}</p>
                  <p className="text-xs text-primary font-semibold mt-0.5">
                    {formatBRL(i.price)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => setQty(i.id, i.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm w-8 text-center">{i.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => setQty(i.id, i.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 ml-auto text-muted-foreground hover:text-destructive"
                      onClick={() => remove(i.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <form onSubmit={submit} className="border-t border-border p-6 space-y-3 bg-card/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total estimado</span>
              <span className="text-xl font-bold text-primary">{formatBRL(total)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cn">Nome *</Label>
              <Input
                id="cn"
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="wp">WhatsApp *</Label>
                <Input
                  id="wp"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="(11) 9..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em">E-mail *</Label>
                <Input
                  id="em"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nt">Observações</Label>
              <Textarea
                id="nt"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
    <Button type="submit" disabled={submitting} className="w-full btn-glow border-0">
              {submitting ? "Enviando..." : "Enviar Orçamento por E-mail"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-[#25D366] hover:bg-[#1faa54] text-white border-0"
              onClick={() => {
                const parsed = formSchema.safeParse(form);
                const lines = items.map(
                  (i) => `• ${i.name} — ${i.quantity}x ${formatBRL(i.price)} = ${formatBRL(i.price * i.quantity)}`
                );
                const header = `Olá! Gostaria de solicitar um orçamento:`;
                const customer = parsed.success
                  ? `\n\n*Cliente:* ${parsed.data.customer_name}\n*WhatsApp:* ${parsed.data.whatsapp}\n*E-mail:* ${parsed.data.email}${parsed.data.notes ? `\n*Obs:* ${parsed.data.notes}` : ""}`
                  : "";
                const body = `\n\n${lines.join("\n")}\n\n*Total estimado:* ${formatBRL(total)}${customer}`;
                const text = encodeURIComponent(header + body);
                window.open(`https://wa.me/${STORE_WHATSAPP}?text=${text}`, "_blank");
              }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar pelo WhatsApp
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
