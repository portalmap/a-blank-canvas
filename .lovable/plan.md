## Diagnóstico

Erro no Postgres ao criar workspace:

```
insert or update on table "workspace_members" violates foreign key constraint "workspace_members_workspace_id_fkey"
```

Causa: o trigger `on_workspace_created` está definido como **BEFORE INSERT** em `workspaces` e, dentro dele, `add_workspace_creator_as_member` insere em `workspace_members` referenciando `NEW.id`. Como a linha do workspace ainda não foi gravada, a FK `workspace_id_fkey` (IMMEDIATE) falha e o insert inteiro é revertido → toast "Erro ao criar workspace".

O trigger faz duas coisas:
1. `NEW.created_by_user_id := COALESCE(NEW.created_by_user_id, auth.uid())` — precisa ser BEFORE.
2. `INSERT INTO workspace_members ...` — precisa ser AFTER (senão FK quebra).

## Correção (migração)

Dividir em dois triggers e duas funções:

- `set_workspace_creator()` — BEFORE INSERT, apenas seta `created_by_user_id`.
- `add_workspace_creator_as_member()` (redefinida) — AFTER INSERT, insere em `workspace_members` usando `NEW.id`, mantendo o `ON CONFLICT DO NOTHING`.
- Recriar o trigger `on_workspace_created` como AFTER INSERT apontando para a nova função de membership; criar novo trigger BEFORE INSERT `set_workspace_creator_before_insert` para o campo `created_by_user_id`.

Nenhuma alteração em RLS, GRANTs, ou outras tabelas. Nenhuma mudança no código do frontend (`useCreateWorkspace` continua igual).

## Fora do escopo

- Fluxo SSO / MAP Hub.
- Trigger `create_default_statuses_for_workspace` (já é AFTER e funciona; segue como está, mesmo estando duplicado — pode ser limpo depois).
- `WorkspaceRequiredGuard` (já ajustado).

## Verificação

Após aplicar a migração, clicar em "Criar Workspace" com o usuário `global_owner` deve:
1. Inserir em `workspaces`.
2. AFTER trigger insere em `workspace_members` (workspace_id agora existe → FK ok).
3. Toast "Workspace criado com sucesso!" e o guard passa a permitir o acesso normal.
