import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  MessageCircle,
  CreditCard,
  FileText,
  Loader2,
} from "lucide-react";
import { useCart, formatBRL } from "@/lib/cart";
import { toast } from "sonner";
import { z } from "zod";

const STORE_WHATSAPP = "5511973460073";

const formSchema = z.object({
  customer_name: z.string().trim().min(2, "Nome muito curto").max(200),
  whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(40),
  email: z.string().trim().email("E-mail inválido").max(320),
  notes: z.string().max(1000).optional(),
});

const addressSchema = z.object({
  cep: z.string().trim().min(8, "CEP inválido").max(12),
  rua: z.string().trim().min(2, "Informe a rua"),
  numero: z.string().trim().min(1, "Informe o número").max(20),
  complemento: z.string().max(120).optional(),
  bairro: z.string().trim().min(2, "Informe o bairro"),
  cidade: z.string().trim().min(2, "Informe a cidade"),
  uf: z.string().trim().length(2, "UF com 2 letras"),
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

  const [mode, setMode] = useState<"quote" | "buy">("quote");
  const [form, setForm] = useState({ customer_name: "", whatsapp: "", email: "", notes: "" });
  const [address, setAddress] = useState({
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [payingNow, setPayingNow] = useState(false);

  const lookupCep = async (raw: string) => {
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data?.erro) return;
      setAddress((a) => ({
        ...a,
        rua: data.logradouro ?? a.rua,
        bairro: data.bairro ?? a.bairro,
        cidade: data.localidade ?? a.cidade,
        uf: data.uf ?? a.uf,
      }));
    } catch {
      // silencioso: o cliente pode preencher à mão
    }
  };

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
      const response = await fetch("/api/send-quote-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: parsed.data.customer_name,
          whatsapp: parsed.data.whatsapp,
          email: parsed.data.email,
          notes: parsed.data.notes ?? null,
          total,
          items: items.map((i) => ({
            product_id: i.id,
            product_name: i.name,
            unit_price: i.price,
            quantity: i.quantity,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Falha ao enviar orçamento");
      }

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

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Adicione produtos ao carrinho");
      return;
    }
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const addr = addressSchema.safeParse(address);
    if (!addr.success) {
      toast.error(addr.error.issues[0].message);
      return;
    }

    setPayingNow(true);
    try {
      const response = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: parsed.data.customer_name,
          whatsapp: parsed.data.whatsapp,
          email: parsed.data.email,
          notes: parsed.data.notes ?? null,
          ...addr.data,
          complemento: addr.data.complemento ?? null,
          items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.checkout_url) {
        throw new Error(data?.error ?? "Não foi possível iniciar o pagamento");
      }
      clear();
      window.location.href = data.checkout_url;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Não foi possível iniciar o pagamento");
    } finally {
      setPayingNow(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Seu Carrinho
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
          <form
            onSubmit={mode === "buy" ? pay : submit}
            className="border-t border-border p-6 space-y-3 bg-card/50 overflow-y-auto max-h-[70vh]"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary">{formatBRL(total)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50">
              <button
                type="button"
                onClick={() => setMode("buy")}
                className={`flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-2 transition-colors ${
                  mode === "buy"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" /> Comprar agora
              </button>
              <button
                type="button"
                onClick={() => setMode("quote")}
                className={`flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-2 transition-colors ${
                  mode === "quote"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Pedir orçamento
              </button>
            </div>

            {mode === "buy" && (
              <p className="text-[11px] text-muted-foreground">
                Pagamento seguro pelo Mercado Pago: Pix ou cartão de crédito.
              </p>
            )}

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

            {mode === "buy" && (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Endereço de entrega
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input
                      id="cep"
                      inputMode="numeric"
                      placeholder="00000-000"
                      value={address.cep}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAddress({ ...address, cep: v });
                        lookupCep(v);
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="num">Número *</Label>
                    <Input
                      id="num"
                      value={address.numero}
                      onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rua">Rua *</Label>
                  <Input
                    id="rua"
                    value={address.rua}
                    onChange={(e) => setAddress({ ...address, rua: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="comp">Complemento</Label>
                    <Input
                      id="comp"
                      value={address.complemento}
                      onChange={(e) =>
                        setAddress({ ...address, complemento: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro *</Label>
                    <Input
                      id="bairro"
                      value={address.bairro}
                      onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input
                      id="cidade"
                      value={address.cidade}
                      onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uf">UF *</Label>
                    <Input
                      id="uf"
                      maxLength={2}
                      value={address.uf}
                      onChange={(e) =>
                        setAddress({ ...address, uf: e.target.value.toUpperCase() })
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nt">Observações</Label>
              <Textarea
                id="nt"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {mode === "buy" ? (
              <Button
                type="submit"
                disabled={payingNow}
                className="w-full btn-glow border-0"
              >
                {payingNow ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Abrindo pagamento...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" /> Pagar com Pix ou cartão
                  </>
                )}
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="w-full btn-glow border-0">
                {submitting ? "Enviando..." : "Enviar Orçamento por E-mail"}
              </Button>
            )}

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
