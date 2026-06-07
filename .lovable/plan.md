## Excluir usuário victorborges@assessoriamap.com.br

Usuário encontrado em `auth.users`:
- **ID**: `9615d7ce-2a2d-43c1-b964-ad0472852d3d`
- **Email**: victorborges@assessoriamap.com.br
- **Criado em**: 2026-06-07

### Ação

Executar `DELETE FROM auth.users WHERE id = '9615d7ce-2a2d-43c1-b964-ad0472852d3d'` via tool de insert/delete.

O cascade existente já remove automaticamente:
- `public.profiles` (FK on delete cascade)
- `public.workspace_members`, `user_roles`, `session_context` e demais tabelas que referenciam `auth.users(id)` com `on delete cascade`
- Sessões ativas do Supabase Auth

### Observações

- Operação **irreversível**. Após confirmação, o usuário não conseguirá mais logar via SSO neste app (mas o registro no Hub continua existindo — exclusão no Hub é separada).
- Se ele tentar logar novamente via SSO, o `sso-exchange` recriará o usuário com novo ID e perfil zerado (sem roles, sem workspaces).
- Caso queira preservar histórico (tarefas concluídas, posts), avise antes — podemos em vez disso apenas revogar acesso (remover de `workspace_members` e `user_roles`) sem deletar o auth user.

Confirma a exclusão completa?