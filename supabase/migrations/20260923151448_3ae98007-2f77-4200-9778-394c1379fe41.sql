DROP POLICY IF EXISTS "service role manages app secrets" ON public.app_secrets;
CREATE POLICY "service role manages app secrets"
ON public.app_secrets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_order_payment(uuid, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_order_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_status(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid) TO service_role;