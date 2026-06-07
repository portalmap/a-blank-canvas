CREATE TABLE public.session_context (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  login_at timestamptz NOT NULL DEFAULT now(),
  baseline_ip text,
  baseline_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.session_context TO authenticated;
GRANT ALL ON public.session_context TO service_role;

ALTER TABLE public.session_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session context"
  ON public.session_context FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_session_context_updated_at
  BEFORE UPDATE ON public.session_context
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();