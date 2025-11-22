-- Criar enum para papéis globais do sistema
CREATE TYPE public.app_role AS ENUM ('global_owner', 'admin', 'user');

-- Criar tabela de papéis de usuário
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função de segurança para verificar papéis
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é proprietário global
CREATE OR REPLACE FUNCTION public.is_global_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'global_owner')
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Global owners can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_global_owner(auth.uid()));

CREATE POLICY "Global owners can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_global_owner(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Atribuir papel de global_owner ao usuário atual
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'global_owner'::app_role
FROM auth.users
ORDER BY created_at ASC
LIMIT 1;