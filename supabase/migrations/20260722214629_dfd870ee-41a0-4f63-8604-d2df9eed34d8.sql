CREATE TABLE public.relay_diagnostico_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  direcao      text        NOT NULL CHECK (direcao IN ('enviado','recebido')),
  mensagem_id  text,
  origem       text,
  destino      text,
  assunto      text,
  modo         text,
  payload      jsonb,
  status_code  int,
  observacao   text,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.relay_diagnostico_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.relay_diagnostico_log FROM anon, authenticated;
GRANT ALL ON TABLE public.relay_diagnostico_log TO service_role;