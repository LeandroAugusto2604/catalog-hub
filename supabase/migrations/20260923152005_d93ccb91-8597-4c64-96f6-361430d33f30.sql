CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.get_order_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_status(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_order_status(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_status(uuid) TO service_role;