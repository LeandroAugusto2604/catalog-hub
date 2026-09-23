CREATE SEQUENCE IF NOT EXISTS public.orders_number_seq START 1001;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number integer NOT NULL DEFAULT nextval('public.orders_number_seq');
ALTER SEQUENCE public.orders_number_seq OWNED BY public.orders.order_number;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_key ON public.orders(order_number);
GRANT USAGE, SELECT ON SEQUENCE public.orders_number_seq TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_order_status(uuid);
CREATE FUNCTION public.get_order_status(_order_id uuid)
RETURNS TABLE(id uuid, status text, total numeric, customer_name text, created_at timestamptz, order_number integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT o.id, o.status, o.total, o.customer_name, o.created_at, o.order_number FROM public.orders o WHERE o.id = _order_id
$$;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.lookup_order(_name text, _number integer)
RETURNS TABLE(order_number integer, status text, shipping_status text, total numeric, shipping_service text, shipping_days integer, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT o.order_number, o.status, o.shipping_status, o.total, o.shipping_service, o.shipping_days, o.created_at, o.updated_at
  FROM public.orders o
  WHERE o.order_number = _number
    AND lower(regexp_replace(trim(o.customer_name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(_name), '\s+', ' ', 'g'))
$$;
GRANT EXECUTE ON FUNCTION public.lookup_order(text, integer) TO anon, authenticated, service_role;