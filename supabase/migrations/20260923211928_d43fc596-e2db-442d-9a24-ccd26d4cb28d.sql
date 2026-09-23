CREATE OR REPLACE FUNCTION public.claim_superfrete(_token text, _order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_secrets WHERE key='order_webhook_token' AND value=_token) THEN RETURN false; END IF;
  UPDATE public.orders SET superfrete_id = 'criando'
  WHERE id=_order_id AND (superfrete_id IS NULL OR (superfrete_id='criando' AND updated_at < now() - interval '10 minutes'));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END; $$;
CREATE OR REPLACE FUNCTION public.release_superfrete(_token text, _order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_secrets WHERE key='order_webhook_token' AND value=_token) THEN RETURN false; END IF;
  UPDATE public.orders SET superfrete_id = NULL WHERE id=_order_id AND superfrete_id='criando';
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_superfrete(text, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_superfrete(text, uuid) TO anon, authenticated, service_role;