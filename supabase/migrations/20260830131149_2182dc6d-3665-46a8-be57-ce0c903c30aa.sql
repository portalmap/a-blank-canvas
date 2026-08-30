REVOKE ALL ON FUNCTION public.get_head_projetos_productivity_report(uuid, uuid, timestamptz, timestamptz, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_head_account_productivity_report(uuid, uuid, timestamptz, timestamptz, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_head_projetos_productivity_report(uuid, uuid, timestamptz, timestamptz, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_head_account_productivity_report(uuid, uuid, timestamptz, timestamptz, numeric, numeric) TO authenticated;