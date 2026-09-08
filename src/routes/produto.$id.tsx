import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Play, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/SiteHeader";
import { CartSheet } from "@/components/CartSheet";
import { useCart, formatBRL } from "@/lib/cart";
import { Toaster, toast } from "sonner";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [
      { title: "Produto — Catálogo Digital" },
      {
        name: "description",
        content:
          "Veja fotos e vídeo do produto em detalhes e adicione ao seu orçamento em poucos cliques.",
      },
      { property: "og:title", content: "Produto — Catálogo Digital" },
      {
        property: "og:description",
        content: "Fotos, vídeo e detalhes do produto. Monte seu orçamento online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  image_urls: string[] | null;
  video_url: string | null;
}

type Media = { type: "image" | "video"; url: string };

function ProductPage() {
  const { id } = Route.useParams();
  const add = useCart((s) => s.add);
  const [cartOpen, setCartOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id,name,description,price,image_url,image_urls,video_url")
        .eq("id", id)
        .eq("active", true)
        .maybeSingle();
      setProduct((data as Product) ?? null);
      setActive(0);
      setLoading(false);
    })();
  }, [id]);

  const media: Media[] = useMemo(() => {
    if (!product) return [];
    const imgs =
      product.image_urls && product.image_urls.length > 0
        ? product.image_urls
        : product.image_url
          ? [product.image_url]
          : [];
    return [
      ...imgs.map((url) => ({ type: "image" as const, url })),
      ...(product.video_url ? [{ type: "video" as const, url: product.video_url }] : []),
    ];
  }, [product]);

  const current = media[active];

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % Math.max(media.length, 1));
      if (e.key === "ArrowLeft")
        setActive((i) => (i - 1 + Math.max(media.length, 1)) % Math.max(media.length, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, media.length]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SiteHeader onOpenCart={() => setCartOpen(true)} />
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-[88px_1fr_320px] gap-6">
          <Skeleton className="hidden lg:block h-96 rounded-xl" />
          <Skeleton className="aspect-square rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <SiteHeader onOpenCart={() => setCartOpen(true)} />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold">Produto não encontrado</h1>
          <Link to="/" className="inline-block mt-6">
            <Button className="btn-glow border-0">Voltar ao catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  const cover = media.find((m) => m.type === "image")?.url ?? null;

  return (
    <div className="min-h-screen">
      <Toaster theme="dark" position="top-center" richColors />
      <SiteHeader onOpenCart={() => setCartOpen(true)} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      <div className="container mx-auto px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao catálogo
        </Link>
      </div>

      <main className="container mx-auto px-4 pb-16">
        <div className="card-elevated rounded-2xl p-4 sm:p-6 grid gap-6 lg:grid-cols-[76px_minmax(0,1fr)_320px]">
          {/* Miniaturas verticais */}
          <div className="flex lg:flex-col gap-2 order-2 lg:order-1 overflow-x-auto lg:overflow-visible">
            {media.map((m, i) => (
              <button
                key={m.url + i}
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={m.type === "video" ? "Vídeo do produto" : `Foto ${i + 1}`}
                className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                  i === active
                    ? "border-primary"
                    : "border-border opacity-70 hover:opacity-100 hover:border-primary/50"
                }`}
              >
                {m.type === "video" ? (
                  <span className="w-full h-full flex items-center justify-center bg-black/70 text-white">
                    <Play className="h-4 w-4" />
                  </span>
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>

          {/* Palco */}
          <div className="order-1 lg:order-2 relative">
            <div
              ref={stageRef}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted"
              onMouseEnter={() => current?.type === "image" && setZoom(true)}
              onMouseLeave={() => {
                setZoom(false);
                setLens(null);
              }}
              onMouseMove={(e) => {
                if (current?.type !== "image") return;
                const r = e.currentTarget.getBoundingClientRect();
                setLens({
                  x: ((e.clientX - r.left) / r.width) * 100,
                  y: ((e.clientY - r.top) / r.height) * 100,
                });
              }}
            >
              {current?.type === "video" ? (
                <video
                  src={current.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                />
              ) : current ? (
                <img
                  src={current.url}
                  alt={product.name}
                  onClick={() => setLightbox(true)}
                  className="w-full h-full object-contain cursor-zoom-in"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sem imagem
                </div>
              )}

              {current?.type === "image" && lens && (
                <div
                  className="hidden lg:block absolute w-32 h-32 -ml-16 -mt-16 rounded-full border-2 border-primary/70 pointer-events-none"
                  style={{
                    left: `${lens.x}%`,
                    top: `${lens.y}%`,
                    boxShadow: "var(--shadow-glow)",
                    background: "color-mix(in oklab, var(--primary) 12%, transparent)",
                  }}
                />
              )}
            </div>

            {/* Pré-visualização ampliada ao passar o mouse */}
            {zoom && current?.type === "image" && lens && (
              <div
                className="hidden lg:block absolute left-[calc(100%+1rem)] top-0 w-[420px] h-[420px] rounded-xl border border-border overflow-hidden z-30 bg-background"
                style={{ boxShadow: "var(--shadow-elevated)" }}
              >
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${current.url})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "250%",
                    backgroundPosition: `${lens.x}% ${lens.y}%`,
                  }}
                />
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground hidden lg:block">
              Passe o mouse para ampliar · clique para ver em tela cheia
            </p>
          </div>

          {/* Informações */}
          <aside className="order-3 lg:sticky lg:top-24 self-start w-full">
            <h1 className="text-2xl font-semibold leading-tight">{product.name}</h1>
            <p className="mt-4 text-3xl font-bold text-primary">
              {formatBRL(Number(product.price))}
            </p>
            <Button
              className="btn-glow border-0 w-full mt-5 h-11"
              onClick={() => {
                add({
                  id: product.id,
                  name: product.name,
                  price: Number(product.price),
                  image_url: cover,
                });
                toast.success("Adicionado ao orçamento");
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar ao orçamento
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2 h-11"
              onClick={() => setCartOpen(true)}
            >
              Ver meu orçamento
            </Button>

            {product.description && (
              <div className="mt-6 pt-6 border-t border-border">
                <h2 className="text-sm font-semibold mb-2">Descrição</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Tela cheia */}
      {lightbox && current && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Fechar"
            className="absolute top-4 right-4 h-10 w-10 rounded-full border border-border flex items-center justify-center hover:border-primary"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {media.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                className="absolute left-4 h-11 w-11 rounded-full border border-border flex items-center justify-center hover:border-primary bg-background/60"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((i) => (i - 1 + media.length) % media.length);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Próxima"
                className="absolute right-4 h-11 w-11 rounded-full border border-border flex items-center justify-center hover:border-primary bg-background/60"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive((i) => (i + 1) % media.length);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <div className="max-w-5xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {current.type === "video" ? (
              <video src={current.url} controls playsInline className="max-h-[85vh] rounded-xl" />
            ) : (
              <img
                src={current.url}
                alt={product.name}
                className="max-h-[85vh] w-auto rounded-xl object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
