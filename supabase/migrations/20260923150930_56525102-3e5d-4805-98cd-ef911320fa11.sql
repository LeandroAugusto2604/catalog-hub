ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ordered_products AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at DESC, name ASC)::integer AS new_sort_order
  FROM public.products
)
UPDATE public.products AS p
SET sort_order = ordered_products.new_sort_order
FROM ordered_products
WHERE p.id = ordered_products.id
  AND p.sort_order = 0;

CREATE INDEX IF NOT EXISTS products_sort_order_idx
ON public.products (sort_order, created_at DESC);