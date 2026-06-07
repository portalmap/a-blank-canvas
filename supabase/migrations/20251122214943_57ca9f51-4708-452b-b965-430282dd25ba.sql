-- Criar tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Users can view profiles from workspace members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid()
      AND wm2.user_id = profiles.id
  )
);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Função para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Atualizar função validate_role_change para permitir owner editar a si mesmo
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Owner editando a si mesmo: permitir com aviso
  IF OLD.role = 'owner' AND OLD.user_id = auth.uid() THEN
    RETURN NEW;
  END IF;
  
  -- Não-owner tentando editar owner: bloquear
  IF OLD.role = 'owner' AND OLD.user_id != auth.uid() THEN
    IF NOT user_has_workspace_role(auth.uid(), NEW.workspace_id, 'owner') THEN
      RAISE EXCEPTION 'Apenas o proprietário pode modificar seu próprio role';
    END IF;
  END IF;
  
  -- Impedir que não-owners se promovam a owner
  IF NEW.role = 'owner' AND OLD.role != 'owner' THEN
    IF NOT user_has_workspace_role(auth.uid(), NEW.workspace_id, 'owner') THEN
      RAISE EXCEPTION 'Apenas proprietários podem promover alguém a proprietário';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;