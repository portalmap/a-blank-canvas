CREATE TABLE public.hub_inbox_processed (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mensagem_id text NOT NULL UNIQUE,
  assunto text NOT NULL,
  resposta jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.hub_inbox_processed TO service_role;

ALTER TABLE public.hub_inbox_processed ENABLE ROW LEVEL SECURITY;