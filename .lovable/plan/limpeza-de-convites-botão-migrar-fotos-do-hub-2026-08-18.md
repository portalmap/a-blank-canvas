# Limpeza de convites + botão "Migrar fotos do Hub"

## Parte 1 — Remover convite e cadastro manual de usuário

Como o acesso agora é 100% via SSO do MAP Hub, todo o fluxo de convite/cadastro local sai:

- Em `src/components/settings/UserManagement.tsx`: remover os botões "Convidar Usuário" e "Adicionar Manualmente", o estado/dialog associado e os ícones não usados.
- Excluir `src/components/settings/UserInviteForm.tsx` e `src/components/settings/UserAddDialog.tsx`.
- Excluir a página de aceite `src/page-views/AcceptInvite.tsx` e a rota `src/routes/accept-invite.$token.tsx` (a rota deixa de existir; o route tree é regenerado automaticamente).
- Excluir as edge functions `add-user-with-invite` e `send-invitation-email` e suas entradas em `supabase/config.toml`.
- Verificar que nenhum outro arquivo importa esses módulos e ajustar imports remanescentes.

A tabela `public.user_invitations` **não** será dropada (histórico); ela apenas deixa de ser usada pelo app. Se quiser, removo em um passo separado.

## Parte 2 — Botão "Migrar fotos do Hub"

O MAP Flow já sincroniza foto no login SSO (bucket privado `avatars`, colunas `avatar_path`/`avatar_origem`, URL assinada de 10 anos), então o que falta é o backfill dos perfis antigos que ainda apontam para a URL assinada do Hub (expira em 7 dias).

- Criar `supabase/functions/_shared/avatar-sync.ts` com `copyRemoteAvatar` (download, valida `image/*` e 5 MB, upload em `{user_id}/{timestamp}.{ext}` com upsert, devolve URL assinada de 10 anos) e `syncHubAvatar` (regras de precedência; nunca lança erro).
- Refatorar `supabase/functions/sso-exchange/index.ts` para usar o helper compartilhado no lugar do bloco inline, mantendo o `try/catch` isolado (falha de foto nunca bloqueia login).
- Criar a edge function `admin-avatars-backfill` (função dedicada, para não mexer em `api-gateway` nem em outras funções): exige usuário autenticado com papel admin/owner/global_owner, percorre `profiles` com `avatar_url` preenchida, marca como `skipped` as que já começam com `${SUPABASE_URL}/storage/v1/`, copia as demais com `copyRemoteAvatar`, atualiza `avatar_url`/`avatar_path`/`avatar_origem` (nunca sobrescreve `local`) e responde `{ success, migrated, failed, skipped, results }`.
- Em `UserManagement.tsx`: adicionar o botão "Migrar fotos do Hub" (ícone `ImageDown`, estado de carregamento, toast com migradas/falhadas, refetch da lista ao final), visível apenas para admin.
- Upload manual de foto já grava `avatar_origem = 'local'` e o `AvatarFallback` com iniciais é mantido.

## Detalhes técnicos

- Bucket `avatars` privado e políticas em `storage.objects` já existem — nenhuma migration nova é necessária (colunas `avatar_path`, `avatar_origem` já criadas).
- A função de backfill usa service role apenas dentro da edge function, após validar o papel do chamador via `has_role`/`is_system_admin`.
- Operação idempotente: rodar de novo só gera `skipped`.
