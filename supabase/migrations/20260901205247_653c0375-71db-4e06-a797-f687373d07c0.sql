REVOKE EXECUTE ON FUNCTION public.can_manage_space_template(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_app_admin(uuid) FROM anon, authenticated;