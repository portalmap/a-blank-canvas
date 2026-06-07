-- Tabela: webhook_endpoints (Configuração de webhooks outbound)
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: webhook_deliveries (Fila de saída + histórico)
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER DEFAULT 0,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  last_status_code INTEGER,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

-- Tabela: webhook_inbox (Eventos recebidos)
CREATE TABLE public.webhook_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  headers JSONB,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  error TEXT,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(status, next_attempt_at);
CREATE INDEX idx_webhook_deliveries_endpoint ON public.webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_endpoints_workspace ON public.webhook_endpoints(workspace_id);
CREATE INDEX idx_webhook_inbox_workspace ON public.webhook_inbox(workspace_id);

-- Enable RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_inbox ENABLE ROW LEVEL SECURITY;

-- RLS: webhook_endpoints (apenas admins do workspace podem gerenciar)
CREATE POLICY "Admins can manage webhook endpoints"
ON public.webhook_endpoints
FOR ALL
USING (user_is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Members can view webhook endpoints"
ON public.webhook_endpoints
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_members.workspace_id = webhook_endpoints.workspace_id
    AND workspace_members.user_id = auth.uid()
));

-- RLS: webhook_deliveries (membros do workspace podem ver via endpoint)
CREATE POLICY "Members can view deliveries"
ON public.webhook_deliveries
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM webhook_endpoints we
  JOIN workspace_members wm ON wm.workspace_id = we.workspace_id
  WHERE we.id = webhook_deliveries.endpoint_id
    AND wm.user_id = auth.uid()
));

CREATE POLICY "System can insert deliveries"
ON public.webhook_deliveries
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update deliveries"
ON public.webhook_deliveries
FOR UPDATE
USING (true);

-- RLS: webhook_inbox (membros do workspace podem ver)
CREATE POLICY "Members can view inbox"
ON public.webhook_inbox
FOR SELECT
USING (
  workspace_id IS NULL OR
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = webhook_inbox.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert inbox"
ON public.webhook_inbox
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update inbox"
ON public.webhook_inbox
FOR UPDATE
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();