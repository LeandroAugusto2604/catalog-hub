-- Revoga execução pública das funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Re-grant has_role para uso em RLS (chamado pelo postgres durante check de policy)
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;

-- Substituir policies "always true" por checks reais
DROP POLICY IF EXISTS "anyone creates quote" ON public.quotes;
CREATE POLICY "anyone creates quote" ON public.quotes
  FOR INSERT
  WITH CHECK (
    char_length(customer_name) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 320
    AND char_length(whatsapp) BETWEEN 5 AND 40
  );

DROP POLICY IF EXISTS "anyone creates quote_items" ON public.quote_items;
CREATE POLICY "anyone creates quote_items" ON public.quote_items
  FOR INSERT
  WITH CHECK (
    quantity > 0
    AND char_length(product_name) BETWEEN 1 AND 200
    AND unit_price >= 0
  );

-- Bloqueia listagem do bucket public 'products' (mas mantém leitura por path direto)
DROP POLICY IF EXISTS "public read products bucket" ON storage.objects;
-- Sem policy de SELECT pública: arquivos seguem acessíveis via URL pública do CDN do storage
-- (a URL pública não passa por RLS de storage.objects).