## Objetivo
Garantir que o Workspace seja realmente independente — não obrigatório atrelar/manter um "usuário responsável".

## Análise atual

**Estado bom (já OK):**
- `workspaces` não tem coluna `owner_user_id` — só `created_by_user_id` (nullable).
- Enum `workspace_role` = `admin | member | limited_member | guest` (sem `owner`).
- Políticas RLS de UPDATE/DELETE usam `workspace_members` (papel admin) + `is_global_owner`, não dependem de "creator".
- UI de criação (`WorkspaceOverview`, `AppSidebar`) pede apenas nome — não solicita responsável.

**Pontos que amarram o workspace a um usuário:**
1. FK `workspaces.created_by_user_id → auth.users(id)` está sem `ON DELETE`. Se o usuário criador for excluído, o `DELETE` do usuário falha (RESTRICT), bloqueando remoção do "responsável".
2. Trigger `add_workspace_creator_as_member` faz:
   - `NEW.created_by_user_id := auth.uid();`
   - `INSERT INTO workspace_members (…, auth.uid(), 'admin')`
   Se `auth.uid()` for `NULL` (criação via service_role / edge function / SQL admin), o INSERT em `workspace_members` falha (user_id NOT NULL) e a criação quebra.

## Mudanças propostas

### 1. Migration (schema)
- Alterar FK `workspaces_created_by_user_id_fkey` para `ON DELETE SET NULL`, permitindo excluir o usuário criador sem impacto no workspace.
- Recriar a função `add_workspace_creator_as_member` para tornar tudo condicional a `auth.uid() IS NOT NULL`:
  - Só define `created_by_user_id` se houver usuário autenticado.
  - Só insere em `workspace_members` se houver `auth.uid()`.
  - Workspace criado via admin/SQL/edge fica sem creator e sem membro inicial (admins globais mantêm acesso via `is_system_admin`).

### 2. Verificação de código (sem alterações previstas)
- Confirmar que nenhum hook/UI trata `created_by_user_id` como campo obrigatório de exibição/edição do workspace.
- Confirmar que `useWorkspaces` continua funcionando quando o workspace não tem membros ainda (já tem fallback que adiciona o usuário atual como admin).

## Fora de escopo
- Nenhuma mudança em spaces/`account_user_id` (esse é intencional por escopo separado).
- Nenhuma mudança na UI de criação/edição de workspace.

## Detalhes técnicos
SQL da migration (resumo):
```sql
ALTER TABLE public.workspaces
  DROP CONSTRAINT workspaces_created_by_user_id_fkey,
  ADD CONSTRAINT workspaces_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.add_workspace_creator_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by_user_id := COALESCE(NEW.created_by_user_id, auth.uid());
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
```