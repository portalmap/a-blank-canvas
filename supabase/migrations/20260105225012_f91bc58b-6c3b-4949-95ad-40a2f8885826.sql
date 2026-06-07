-- Drop incomplete objects from failed migration
DROP TABLE IF EXISTS public.api_tokens CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_admin(uuid, uuid);

-- Create api_tokens table for external integrations
CREATE TABLE public.api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  target_list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  default_status_id UUID REFERENCES statuses(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '["create_task"]'::jsonb,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create index for faster token lookups
CREATE INDEX idx_api_tokens_token ON public.api_tokens(token);
CREATE INDEX idx_api_tokens_workspace ON public.api_tokens(workspace_id);

-- Enable RLS
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is workspace admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = _user_id
      AND workspace_id = _workspace_id
      AND role = 'admin'
  )
$$;

-- RLS Policies for api_tokens
CREATE POLICY "Workspace admins can view tokens"
ON public.api_tokens
FOR SELECT
TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can create tokens"
ON public.api_tokens
FOR INSERT
TO authenticated
WITH CHECK (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can update tokens"
ON public.api_tokens
FOR UPDATE
TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Workspace admins can delete tokens"
ON public.api_tokens
FOR DELETE
TO authenticated
USING (public.is_workspace_admin(auth.uid(), workspace_id));