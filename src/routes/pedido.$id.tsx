import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle, Loader2, ArrowLeft, Mail } from "lucide-react";
import { formatBRL } from "@/lib/cart";
import { Toaster } from "sonner";

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Status do pedido — TudoTop&LarTech" },
      {
        name: "description",
        content:
          "Acompanhe a confirmação do pagamento do seu pedido na TudoTop&LarTech.",
      },
      { property: "og:title", content: "Status do pedido — TudoTop&LarTech" },
      {
        property: "og:description",
        content: "Acompanhe a confirmação do pagamento do seu pedido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderStatusPage,
});

interface OrderStatus {
  id: string;
  status: string;
  total: number;
  customer_name: string;
  created_at: string;
  order_number?: number;
}

const LABELS: Record<string, { title: string; text: string; tone: string }> = {
  pago: {
    title: "Pagamento confirmado!",
    text: "Recebemos seu pagamento e enviaremos a confirmação por e-mail. Vamos entrar em contato pelo WhatsApp para combinar a entrega.",
    tone: "ok",
  },
  pendente: {
    title: "Aguardando pagamento",
    text: "Se você escolheu Pix, a confirmação aparece aqui em alguns instantes após o pagamento.",
    tone: "wait",
  },
  recusado: {
    title: "Pagamento não aprovado",
    text: "O pagamento foi recusado. Você pode tentar novamente com outro cartão ou via Pix.",
    tone: "bad",
  },
  cancelado: {
    title: "Pagamento cancelado",
    text: "O pagamento foi cancelado. Se quiser, refaça o pedido na loja.",
    tone: "bad",
  },
  devolvido: { title: "Pagamento devolvido", text: "O valor foi devolvido.", tone: "bad" },
};

function OrderStatusPage() {
  const { id } = useParams({ from: "/pedido/$id" });
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!active) return;
      try {
        const response = await fetch(`/api/order-status/${encodeURIComponent(id)}`);
        const data = await response.json().catch(() => null);
        if (!active) return;
        setOrder(response.ok ? ((data?.order as OrderStatus | null) ?? null) : null);
      } catch {
        if (!active) return;
        setOrder(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [id]);

  const info = order ? (LABELS[order.status] ?? LABELS.pendente) : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Toaster theme="dark" position="top-center" richColors />
      <div className="card-elevated rounded-2xl p-8 max-w-md w-full text-center">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        ) : !order ? (
          <>
            <XCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h1 className="text-xl font-semibold mb-2">Pedido não encontrado</h1>
            <p className="text-sm text-muted-foreground">
              Verifique o link recebido por e-mail.
            </p>
          </>
        ) : (
          <>
            {info!.tone === "ok" ? (
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
            ) : info!.tone === "wait" ? (
              <Clock className="h-12 w-12 text-primary mx-auto mb-3 animate-pulse" />
            ) : (
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
            )}
            <h1 className="text-2xl font-bold mb-2">{info!.title}</h1>
            <p className="text-sm text-muted-foreground mb-6">{info!.text}</p>

            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente</span>
                <span>{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-semibold text-primary">
                  {formatBRL(Number(order.total))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pedido</span>
                <span className="font-bold text-lg text-primary">nº {order.order_number ?? order.id.slice(0, 8)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Guarde este número. Você pode consultar o pedido depois em "Meu pedido", com seu nome completo e o número.
            </p>
            {(info!.tone === "ok" || info!.tone === "wait") && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 text-left text-xs text-muted-foreground">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Você receberá um <strong className="text-foreground">e-mail de confirmação do pedido</strong>.
                  Se não encontrar na caixa de entrada, procure na caixa de <strong className="text-foreground">spam</strong>.
                </span>
              </p>
            )}
          </>
        )}

        <Link to="/" className="block mt-6">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar à loja
          </Button>
        </Link>
      </div>
    </div>
  );
}
