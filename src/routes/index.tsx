import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { CartSheet } from "@/components/CartSheet";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catálogo Digital — Solicite seu orçamento" },
      {
        name: "description",
        content:
          "Catálogo de produtos com solicitação de orçamento via WhatsApp e e-mail. Selecione, envie e receba.",
      },
      { property: "og:title", content: "Catálogo Digital" },
      { property: "og:description", content: "Vitrine de produtos e orçamento online." },
    ],
  }),
  component: Index,
});

interface Category {
  id: string;
  name: string;
  slug: string;
}
interface Product extends ProductCardData {
  category_id: string | null;
}

function Index() {
  const [cartOpen, setCartOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [cats, prods] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase
          .from("products")
          .select("id,name,description,price,image_url,category_id")
          .eq("active", true)
          .order("created_at", { ascending: false }),
      ]);
      setCategories(cats.data ?? []);
      setProducts((prods.data as Product[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      if (activeCat && p.category_id !== activeCat) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [products, search, activeCat]);

  return (
    <div className="min-h-screen">
      <Toaster theme="dark" position="top-center" richColors />
      <SiteHeader onOpenCart={() => setCartOpen(true)} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "var(--gradient-radial-glow)" }}
        />
        <div className="container mx-auto px-4 py-16 sm:py-24 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs text-primary mb-4 px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
              <Sparkles className="h-3 w-3" />
              Catálogo digital · Orçamento em segundos
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              Encontre, selecione e<br />
              <span className="bg-clip-text text-transparent bg-[image:var(--gradient-primary)]">
                receba seu orçamento.
              </span>
            </h1>
            <p className="mt-5 text-muted-foreground text-base sm:text-lg max-w-lg">
              Navegue pelo catálogo, monte seu pedido e envie em poucos cliques.
              Respondemos no seu WhatsApp e e-mail.
            </p>
          </div>

          {/* Busca */}
          <div className="mt-8 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-10 h-12 bg-card border-border"
            />
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <Button
            size="sm"
            variant={activeCat === null ? "default" : "outline"}
            className={activeCat === null ? "btn-glow border-0" : ""}
            onClick={() => setActiveCat(null)}
          >
            Todos
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={activeCat === c.id ? "default" : "outline"}
              className={activeCat === c.id ? "btn-glow border-0" : "shrink-0"}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </section>

      {/* Grid de produtos */}
      <section className="container mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            Nenhum produto encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Catálogo Digital
      </footer>
    </div>
  );
}
