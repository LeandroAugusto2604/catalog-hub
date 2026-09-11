CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  notes text,
  cep text NOT NULL,
  rua text NOT NULL,
  numero text NOT NULL,
  complemento text,
  bairro text NOT NULL,
  cidade text NOT NULL,
  uf text NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  payment_method text,
  mp_preference_id text,
  mp_payment_id text,
  shipping_status text NOT NULL DEFAULT 'aguardando',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL
);

CREATE TABLE public.app_secrets (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, DELETE ON public.order_items TO authenticated;
GRANT INSERT ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;

GRANT ALL ON public.app_secrets TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone creates order" ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(customer_name) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 320
  AND char_length(whatsapp) BETWEEN 5 AND 40
  AND char_length(cep) BETWEEN 8 AND 12
  AND char_length(rua) BETWEEN 1 AND 200
  AND char_length(numero) BETWEEN 1 AND 20
  AND char_length(bairro) BETWEEN 1 AND 120
  AND char_length(cidade) BETWEEN 1 AND 120
  AND char_length(uf) BETWEEN 2 AND 2
  AND total >= 0
  AND status = 'pendente'
);

CREATE POLICY "admins read orders" ON public.orders FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins delete orders" ON public.orders FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "anyone creates order_items" ON public.order_items FOR INSERT TO anon, authenticated
WITH CHECK (
  quantity > 0
  AND char_length(product_name) BETWEEN 1 AND 200
  AND unit_price >= 0
);
CREATE POLICY "admins read order_items" ON public.order_items FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins delete order_items" ON public.order_items FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_secrets (key, value)
VALUES ('order_webhook_token', 'tt_9f4c1e77a2b54d3e8c06ab715d2f8e41');

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  _order_id uuid,
  _status text,
  _mp_payment_id text,
  _payment_method text,
  _token text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected text;
BEGIN
  SELECT value INTO expected FROM public.app_secrets WHERE key = 'order_webhook_token';
  IF expected IS NULL OR _token IS NULL OR _token <> expected THEN
    RETURN false;
  END IF;
  IF _status NOT IN ('pendente', 'pago', 'recusado', 'cancelado', 'devolvido') THEN
    RETURN false;
  END IF;
  UPDATE public.orders
  SET status = _status,
      mp_payment_id = COALESCE(_mp_payment_id, mp_payment_id),
      payment_method = COALESCE(_payment_method, payment_method)
  WHERE id = _order_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_order_status(_order_id uuid)
RETURNS TABLE (id uuid, status text, total numeric, customer_name text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.status, o.total, o.customer_name, o.created_at
  FROM public.orders o
  WHERE o.id = _order_id
$$;

GRANT EXECUTE ON FUNCTION public.get_order_status(uuid) TO anon, authenticated, service_role;