ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_kg numeric NOT NULL DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS height_cm numeric NOT NULL DEFAULT 17,
  ADD COLUMN IF NOT EXISTS width_cm numeric NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS length_cm numeric NOT NULL DEFAULT 7;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_service text,
  ADD COLUMN IF NOT EXISTS shipping_days integer;