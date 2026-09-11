import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, MessageCircle, ChevronDown, MapPin } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/cart";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersAdmin,
});

interface Order {
  id: string;
  customer_name: string;
  whatsapp: string;
  email: string;
  notes: string | null;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  total: number;
  status: string;
  payment_method: string | null;
  shipping_status: string;
  created_at: string;
}
interface Item {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

const SHIPPING = ["aguardando", "separando", "enviado", "entregue"];

function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, Item[]>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const toggle = async (id: string) => {
    if (expanded === id) return setExpanded(null);
    setExpanded(id);
    if (!items[id]) {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", id);
      setItems((s) => ({ ...s, [id]: (data as Item[]) ?? [] }));
    }
  };

  const setShipping = async (id: string, shipping_status: string) => {
    const { error } = await supabase.from("orders").update({ shipping_status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Entrega atualizada");
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, shipping_status } : o)));
  };

  const statusColor = (s: string) =>
    ({
      pago: "bg-green-500/15 text-green-300 border-green-500/30",
      pendente: "bg-primary/15 text-primary border-primary/30",
      recusado: "bg-destructive/15 text-destructive border-destructive/30",
      cancelado: "bg-destructive/15 text-destructive border-destructive/30",
      devolvido: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    }[s] ?? "bg-muted text-muted-foreground border-border");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos pagos</h1>
        <p className="text-sm text-muted-foreground">
          {orders.length} pedido(s) feitos com pagamento no site
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhum pedido pago ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="card-elevated rounded-xl">
              <button
                onClick={() => toggle(o.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{o.customer_name}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(o.status)}`}
                    >
                      {o.status}
                    </span>
                    {o.payment_method && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                        {o.payment_method}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(o.created_at).toLocaleString("pt-BR")} ·{" "}
                    {formatBRL(Number(o.total))} · entrega: {o.shipping_status}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expanded === o.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expanded === o.id && (
                <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <a
                      href={`mailto:${o.email}`}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <Mail className="h-4 w-4" /> {o.email}
                    </a>
                    <a
                      href={`https://wa.me/${o.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <MessageCircle className="h-4 w-4" /> {o.whatsapp}
                    </a>
                  </div>

                  <div className="text-sm rounded-lg bg-card border border-border p-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Endereço de entrega
                    </p>
                    {o.rua}, {o.numero}
                    {o.complemento ? ` - ${o.complemento}` : ""}
                    <br />
                    {o.bairro} — {o.cidade}/{o.uf}
                    <br />
                    CEP {o.cep}
                  </div>

                  {o.notes && (
                    <div className="text-sm rounded-lg bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      {o.notes}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Itens</p>
                    <div className="space-y-1">
                      {(items[o.id] ?? []).map((it) => (
                        <div
                          key={it.id}
                          className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0"
                        >
                          <span>
                            {it.quantity}× {it.product_name}
                          </span>
                          <span className="text-muted-foreground">
                            {formatBRL(Number(it.unit_price) * it.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-semibold pt-2 mt-2 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">{formatBRL(Number(o.total))}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Entrega:</span>
                    <Select
                      value={o.shipping_status}
                      onValueChange={(v) => setShipping(o.id, v)}
                    >
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIPPING.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
