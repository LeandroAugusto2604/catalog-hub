import { useState } from "react";
import { Truck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface ShippingOption {
  id: string;
  name: string;
  company: string;
  price: number;
  days: number;
}

interface Props {
  items: { product_id: string; quantity: number }[];
  cep?: string;
  onCepChange?: (cep: string) => void;
  selectedId?: string | null;
  onSelect?: (o: ShippingOption) => void;
}

export function deliveryDateLabel(days: number, from = new Date()) {
  const d = new Date(from);
  let left = Math.max(0, Math.round(days));
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) left--;
  }
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
}

export function ShippingCalculator({ items, cep: extCep, onCepChange, selectedId, onSelect }: Props) {
  const [localCep, setLocalCep] = useState("");
  const cep = extCep ?? localCep;
  const setCep = onCepChange ?? setLocalCep;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ShippingOption[] | null>(null);

  const calc = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("Digite um CEP com 8 números");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shipping-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: digits, items }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao calcular frete");
      setOptions(data.options);
      if (data.options.length === 0) setError("Nenhuma opção de entrega para este CEP");
      else if (onSelect) onSelect(data.options[0]);
    } catch (e: any) {
      setError(e.message);
      setOptions(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Truck className="h-3.5 w-3.5 text-primary" /> Calcular frete e prazo
      </p>
      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          placeholder="Seu CEP"
          value={cep}
          maxLength={9}
          onChange={(e) => setCep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              calc();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={calc} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {options && options.length > 0 && (
        <div className="space-y-1.5">
          {options.slice(0, 1).map((o) => {
            const active = selectedId === o.id;
            const Tag = onSelect ? "button" : "div";
            return (
              <Tag
                key={o.id}
                type={onSelect ? "button" : undefined}
                onClick={onSelect ? () => onSelect(o) : undefined}
                className={`w-full flex items-center justify-between text-left text-sm rounded-lg border px-3 py-2 transition-colors ${
                  active ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <span>
                  <span className="font-medium">{o.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    Previsão de entrega: {deliveryDateLabel(o.days)}
                  </span>
                </span>
                <span className="font-semibold text-primary">Frete grátis</span>
              </Tag>
            );
          })}
        </div>
      )}
    </div>
  );
}
