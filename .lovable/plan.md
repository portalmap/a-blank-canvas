## Problema

O SSO grava apenas `profiles.role_slug` com o papel vindo do MAP Hub (`administrador_global`, `administrador`, `gestor`, `membro`, `convidado`), mas **todo o sistema de permissões do MAP Flow** (RLS, `is_system_admin`, `can_create_workspace`, etc.) lê de `public.user_roles` — que nunca é populada pelo SSO.

Resultado: um "administrador_global" vindo do Hub entra no MAP Flow sem qualquer permissão real (não consegue criar workspace, não é reconhecido como system admin em RLS). Só o hook `useAppRole` / `is_hub_global_admin` enxerga o papel — e nenhuma policy relevante usa isso.

## Mapeamento Hub → MAP Flow

| Hub role                | `user_roles.role` (app_role) |
| ----------------------- | ---------------------------- |
| `administrador_global`  | `global_owner`               |
| `administrador`         | `admin`                      |
| `gestor` / `membro` / `convidado` | (nenhum papel global; permissões vêm apenas de `workspace_members`) |

`owner` (técnico) fica exclusivamente para gestão manual dentro do MAP Flow — o Hub não emite esse papel.

## Mudanças

### 1. Função `public.sync_hub_role_to_app_roles(_user_id uuid, _role_slug text)`
Nova função SECURITY DEFINER que, dado o usuário e o slug Hub:
- Remove entradas obsoletas em `user_roles` que a função possa ter criado (`global_owner`, `admin`) e que não correspondem mais ao slug atual.
- Insere a linha correspondente ao mapeamento acima (idempotente, `ON CONFLICT DO NOTHING`).
- Não toca em `owner` (papel técnico interno) nem em `workspace_members`.

Executada via migration (não altera dados existentes de owner técnico).

### 2. `sso-exchange` (edge function)
Depois do upsert de `profiles`, chamar `admin.rpc('sync_hub_role_to_app_roles', { _user_id, _role_slug: role })`. Falha aqui é logada mas não bloqueia login (não-fatal, mesmo padrão do `session_context`).

### 3. Backfill único na migration
Rodar `sync_hub_role_to_app_roles` para cada `profiles.id` com `role_slug` já preenchido, para regularizar usuários existentes que entraram antes desse fix.

## Verificação
Após aplicar, com um usuário SSO logado:
- `SELECT role FROM user_roles WHERE user_id = <id>` deve conter `global_owner` para `administrador_global` e `admin` para `administrador`.
- `SELECT is_system_admin('<id>')` e `can_create_workspace('<id>')` devem devolver `true` conforme o papel.

## Fora de escopo
- Nenhum mapeamento automático para `workspace_members` (o Hub não conhece workspaces do MAP Flow — quem entra como `membro/gestor/convidado` continua sendo adicionado a workspaces manualmente pelo admin, como hoje).
- Nenhuma mudança de UI.