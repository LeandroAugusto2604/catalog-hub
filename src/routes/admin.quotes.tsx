import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, MessageCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/lib/cart";

export const Route = createFileRoute("/admin/quotes")({
  component: QuotesAdmin,
});

interface Quote {
  id: string;
  customer_name: string;
  whatsapp: string;
  email: string;
  notes: string | null;
  status: string;
  total: number;
  created_at: string;
}
interface Item {
  id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
}

const STATUSES = ["novo", "em_andamento", "respondido", "fechado", "cancelado"];

function QuotesAdmin() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, Item[]>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    setQuotes((data as Quote[]) ?? []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const toggle = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!items[id]) {
      const { data } = await supabase.from("quote_items").select("*").eq("quote_id", id);
      setItems((s) => ({ ...s, [id]: (data as Item[]) ?? [] }));
    }
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, status } : q)));
  };

  const statusColor = (s: string) =>
    ({
      novo: "bg-primary/15 text-primary border-primary/30",
      em_andamento: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      respondido: "bg-green-500/15 text-green-300 border-green-500/30",
      fechado: "bg-muted text-muted-foreground border-border",
      cancelado: "bg-destructive/15 text-destructive border-destructive/30",
    }[s] ?? "bg-muted text-muted-foreground border-border");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pedidos de Orçamento</h1>
        <p className="text-sm text-muted-foreground">{quotes.length} no total</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum pedido ainda.</div>
      ) : (
        <div className="space-y-2">
          {quotes.map((q) => (
            <div key={q.id} className="card-elevated rounded-xl">
              <button
                onClick={() => toggle(q.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{q.customer_name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColor(q.status)}`}>
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(q.created_at).toLocaleString("pt-BR")} · {formatBRL(Number(q.total))}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expanded === q.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expanded === q.id && (
                <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <a
                      href={`mailto:${q.email}`}
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <Mail className="h-4 w-4" /> {q.email}
                    </a>
                    <a
                      href={`https://wa.me/${q.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <MessageCircle className="h-4 w-4" /> {q.whatsapp}
                    </a>
                  </div>

                  {q.notes && (
                    <div className="text-sm rounded-lg bg-card border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      {q.notes}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Itens</p>
                    <div className="space-y-1">
                      {(items[q.id] ?? []).map((it) => (
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
                      <span className="text-primary">{formatBRL(Number(q.total))}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Status:</span>
                    <Select value={q.status} onValueChange={(v) => setStatus(q.id, v)}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
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
