REVOKE EXECUTE ON FUNCTION public.can_access_management(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_management(uuid) TO authenticated, service_role;