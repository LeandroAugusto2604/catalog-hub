import { ShieldCheck, Lock, CreditCard } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-6 sm:grid-cols-3 text-center sm:text-left">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Site protegido</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Navegação segura do início ao fim: seus dados são trafegados de
              forma criptografada e nunca compartilhados com terceiros.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex items-center gap-2 text-foreground">
              <Lock className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Certificado digital</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Conexão com certificado de segurança (HTTPS), garantindo que as
              informações que você envia cheguem apenas até nós.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex items-center gap-2 text-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold">Pagamento 100% seguro</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
              Os pagamentos são processados pelo Mercado Pago. Não vemos e não
              guardamos os dados de cartão ou Pix dos clientes.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground space-y-1">
          <p>© {new Date().getFullYear()} Tudo Top · Compre com segurança</p>
          <p>CNPJ: 65.713.731/0001-20</p>
        </div>
      </div>
    </footer>
  );
}
