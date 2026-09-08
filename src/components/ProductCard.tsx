import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, formatBRL } from "@/lib/cart";
import { toast } from "sonner";

export interface ProductCardData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  image_urls?: string[] | null;
  video_url?: string | null;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const add = useCart((s) => s.add);

  const images =
    product.image_urls && product.image_urls.length > 0
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : [];

  const media: { type: "image" | "video"; url: string }[] = [
    ...images.map((url) => ({ type: "image" as const, url })),
    ...(product.video_url ? [{ type: "video" as const, url: product.video_url }] : []),
  ];

  const [active, setActive] = useState(0);
  const current = media[active];
  const cover = images[0];

  return (
    <div className="card-elevated rounded-2xl overflow-hidden flex flex-col group">
      <div className="aspect-square bg-muted relative overflow-hidden">
        {current?.type === "video" ? (
          <video
            src={current.url}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-cover bg-black"
          />
        ) : current ? (
          <img
            src={current.url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Sem imagem
          </div>
        )}
        {media.length > 1 && current?.type !== "video" && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(i);
                }}
                aria-label={`Foto ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
      {media.length > 1 && (
        <div className="px-3 pt-3 flex gap-1.5 overflow-x-auto">
          {media.map((m, i) => (
            <button
              key={m.url + i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-12 w-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition ${
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
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
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-medium leading-tight line-clamp-2">
          <Link
            to="/produto/$id"
            params={{ id: product.id }}
            className="hover:text-primary transition-colors"
          >
            {product.name}
          </Link>
        </h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span className="text-lg font-semibold text-primary">
            {formatBRL(Number(product.price))}
          </span>
          <Button
            size="sm"
            className="btn-glow border-0"
            onClick={() => {
              add({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                image_url: cover ?? null,
              });
              toast.success("Adicionado ao orçamento");
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
