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
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const add = useCart((s) => s.add);

  return (
    <div className="card-elevated rounded-2xl overflow-hidden flex flex-col group">
      <div className="aspect-square bg-muted relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Sem imagem
          </div>
        )}
      </div>
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
                image_url: product.image_url,
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
