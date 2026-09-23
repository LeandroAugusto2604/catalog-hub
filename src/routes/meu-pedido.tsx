import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, PackageSearch } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { businessDaysDate } from "@/lib/delivery";

export const Route = createFileRoute("/meu-pedido")({
  head: () => ({
    meta: [
      { title: "Consultar meu pedido — Tudo Top" },
      { name: "description", content: "Consulte o status do seu pedido com seu nome completo e o número do pedido." },
      { property: "og:title", content: "Consultar meu pedido — Tudo Top" },
      { property: "og:description", content: "Acompanhe pagamento e envio do seu pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LookupPage,
});

const PAY: Record<string, string> = {
  pago: "Pagamento confirmado",
  pendente: "Aguardando pagamento",
  recusado: "Pagamento não aprovado",
  cancelado: "Pagamento cancelado",
  devolvido: "Pagamento devolvido",
};
const SHIP: Record<string, string> = {
  aguardando: "Preparando envio",
  enviado: "Enviado",
  entregue: "Entregue",
};

function LookupPage() {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const r = await fetch("/api/order-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, number: number.replace(/\D/g, "") }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.order) setOrder(j.order);
      else setError("Pedido não encontrado. Confira o nome completo e o número do pedido.");
    } catch {
      setError("Não foi possível consultar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card-elevated rounded-2xl p-8 max-w-md w-full">
        <PackageSearch className="h-10 w-10 text-primary mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-center mb-1">Meu pedido</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Informe o nome completo usado na compra e o número do pedido.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="n">Nome completo</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} />
          </div>
          <div>
            <Label htmlFor="num">Número do pedido</Label>
            <Input id="num" inputMode="numeric" placeholder="Ex.: 1001" value={number} onChange={(e) => setNumber(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full btn-glow" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive text-center mt-4">{error}</p>}

        {order && (
          <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-2">
            <Row k="Pedido" v={`nº ${order.order_number}`} />
            <Row k="Pagamento" v={PAY[order.status] ?? order.status} />
            {order.status === "pago" && <Row k="Envio" v={SHIP[order.shipping_status] ?? order.shipping_status} />}
            <Row k="Valor" v={formatBRL(Number(order.total))} />
            {order.shipping_service && <Row k="Frete" v={`Grátis (${order.shipping_service})`} />}
            {order.status === "pago" && Number(order.shipping_days) > 0 && (
              <Row k="Previsão de entrega" v={businessDaysDate(Number(order.shipping_days), new Date(order.updated_at))} />
            )}
            <Row k="Data do pedido" v={new Date(order.created_at).toLocaleDateString("pt-BR")} />
          </div>
        )}

        <Link to="/" className="block mt-6">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao catálogo
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
