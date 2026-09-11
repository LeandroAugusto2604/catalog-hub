-- =====================================================================
-- Estrutura completa do catálogo — rode no SQL Editor do SEU projeto Supabase
-- (Dashboard -> SQL Editor -> New query -> cole tudo -> Run)
--
-- Antes de rodar: crie os 2 buckets em Storage (públicos):
--   product-images   e   products
-- =====================================================================

-- ---------- Tipos ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Funções utilitárias ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ---------- user_roles ----------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- ---------- categories ----------
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ---------- products ----------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  image_urls text[] NOT NULL DEFAULT '{}'::text[],
  video_url text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- quotes ----------
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'novo',
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.quotes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- ---------- quote_items ----------
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL
);
GRANT INSERT ON public.quote_items TO anon;
GRANT SELECT, INSERT ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- ---------- Regras de acesso (RLS) ----------
DROP POLICY IF EXISTS "users see own profile" ON public.profiles;
CREATE POLICY "users see own profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
DROP POLICY IF EXISTS "admins see all profiles" ON public.profiles;
CREATE POLICY "admins see all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "users see own roles" ON public.user_roles;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone reads categories" ON public.categories;
CREATE POLICY "anyone reads categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins manage categories" ON public.categories;
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone reads active products" ON public.products;
CREATE POLICY "anyone reads active products" ON public.products FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "admins read all products" ON public.products;
CREATE POLICY "admins read all products" ON public.products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage products" ON public.products;
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone creates quote" ON public.quotes;
CREATE POLICY "anyone creates quote" ON public.quotes FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(customer_name) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND char_length(whatsapp) BETWEEN 5 AND 40
  );
DROP POLICY IF EXISTS "admins read quotes" ON public.quotes;
CREATE POLICY "admins read quotes" ON public.quotes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins update quotes" ON public.quotes;
CREATE POLICY "admins update quotes" ON public.quotes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins delete quotes" ON public.quotes;
CREATE POLICY "admins delete quotes" ON public.quotes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone creates quote_items" ON public.quote_items;
CREATE POLICY "anyone creates quote_items" ON public.quote_items FOR INSERT TO anon, authenticated
  WITH CHECK (
    quantity > 0
    AND char_length(product_name) BETWEEN 1 AND 200
    AND unit_price >= 0
  );
DROP POLICY IF EXISTS "admins read quote_items" ON public.quote_items;
CREATE POLICY "admins read quote_items" ON public.quote_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- Perfil automático ao criar usuário ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- Regras das fotos (Storage) ----------
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT
  USING (bucket_id IN ('product-images', 'products'));

DROP POLICY IF EXISTS "Admins upload product images" ON storage.objects;
CREATE POLICY "Admins upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('product-images', 'products') AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update product images" ON storage.objects;
CREATE POLICY "Admins update product images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('product-images', 'products') AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete product images" ON storage.objects;
CREATE POLICY "Admins delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('product-images', 'products') AND public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- ÚLTIMO PASSO (depois de criar sua conta em /auth no site):
-- torne seu usuário administrador trocando o e-mail abaixo:
--
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT id, 'admin' FROM auth.users WHERE email = 'seu-email@exemplo.com'
-- ON CONFLICT DO NOTHING;
-- =====================================================================

-- =====================================================================
-- PEDIDOS PAGOS NO SITE (Mercado Pago: Pix + cartão)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.orders (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
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

DROP POLICY IF EXISTS "anyone creates order" ON public.orders;
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
  AND char_length(uf) = 2
  AND total >= 0
  AND status = 'pendente'
);

DROP POLICY IF EXISTS "admins read orders" ON public.orders;
CREATE POLICY "admins read orders" ON public.orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins update orders" ON public.orders;
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins delete orders" ON public.orders;
CREATE POLICY "admins delete orders" ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "anyone creates order_items" ON public.order_items;
CREATE POLICY "anyone creates order_items" ON public.order_items FOR INSERT TO anon, authenticated
WITH CHECK (quantity > 0 AND char_length(product_name) BETWEEN 1 AND 200 AND unit_price >= 0);
DROP POLICY IF EXISTS "admins read order_items" ON public.order_items;
CREATE POLICY "admins read order_items" ON public.order_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins delete order_items" ON public.order_items;
CREATE POLICY "admins delete order_items" ON public.order_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_secrets (key, value)
VALUES ('order_webhook_token', 'tt_9f4c1e77a2b54d3e8c06ab715d2f8e41')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  _order_id uuid, _status text, _mp_payment_id text, _payment_method text, _token text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE expected text;
BEGIN
  SELECT value INTO expected FROM public.app_secrets WHERE key = 'order_webhook_token';
  IF expected IS NULL OR _token IS NULL OR _token <> expected THEN RETURN false; END IF;
  IF _status NOT IN ('pendente','pago','recusado','cancelado','devolvido') THEN RETURN false; END IF;
  UPDATE public.orders
  SET status = _status,
      mp_payment_id = COALESCE(_mp_payment_id, mp_payment_id),
      payment_method = COALESCE(_payment_method, payment_method)
  WHERE id = _order_id;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_order_status(_order_id uuid)
RETURNS TABLE (id uuid, status text, total numeric, customer_name text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.status, o.total, o.customer_name, o.created_at
  FROM public.orders o WHERE o.id = _order_id
$$;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid) TO anon, authenticated, service_role;
