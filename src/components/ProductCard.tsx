import { useState } from "react";
import { Plus } from "lucide-react";
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
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const add = useCart((s) => s.add);

  const images =
    product.image_urls && product.image_urls.length > 0
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : [];

  const [active, setActive] = useState(0);
  const cover = images[active];

  return (
    <div className="card-elevated rounded-2xl overflow-hidden flex flex-col group">
      <div className="aspect-square bg-muted relative overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Sem imagem
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
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
      {images.length > 1 && (
        <div className="px-3 pt-3 flex gap-1.5 overflow-x-auto">
          {images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-12 w-12 rounded-md overflow-hidden flex-shrink-0 border-2 transition ${
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-medium leading-tight line-clamp-2">{product.name}</h3>
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
