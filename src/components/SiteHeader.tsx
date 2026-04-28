import { Link } from "@tanstack/react-router";
import { ShoppingCart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { Badge } from "@/components/ui/badge";

interface Props {
  onOpenCart: () => void;
}

export function SiteHeader({ onOpenCart }: Props) {
  const count = useCart((s) => s.items.reduce((a, i) => a + i.quantity, 0));

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-xl btn-glow flex items-center justify-center font-bold text-lg">
            C
          </div>
          <span className="font-semibold tracking-tight text-lg">
            Catálogo<span className="text-primary">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Admin
            </Button>
          </Link>
          <Button
            onClick={onOpenCart}
            variant="outline"
            size="sm"
            className="relative border-primary/30 hover:border-primary"
          >
            <ShoppingCart className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Orçamento</span>
            {count > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1 bg-primary text-primary-foreground border-0">
                {count}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
