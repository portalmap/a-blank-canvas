# Corrigir o botão "Migrar fotos do Hub"

## O que está acontecendo

O botão falha com "Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY".
Verifiquei o ambiente do servidor: existem `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e
`SUPABASE_PROJECT_ID`, mas a chave de serviço (service role) não está vinculada neste
projeto. A migração de fotos precisa dela porque grava no bucket privado `avatars` e
atualiza perfis de outros usuários, o que ignora as regras de acesso normais.

Ou seja: não é bug de lógica do botão — é uma credencial de servidor ausente.

## Correção

1. Revincular a chave de serviço do Supabase no projeto (ação de plataforma, sem mexer no código).
2. Rodar o botão novamente e confirmar o resumo (migradas / falhas / ignoradas).

## Plano B (se a chave não puder ser revinculada)

Mover a rotina de migração para uma Edge Function do Supabase (`avatar-backfill`), que já
recebe a chave de serviço automaticamente no ambiente do Supabase, e fazer o botão chamar
essa função. A server function `backfillAvatarsFromHub` passaria a ser um proxy fino,
mantendo a mesma verificação de permissão (global_owner / owner / admin de workspace) e a
mesma regra de nunca sobrescrever fotos com `avatar_origem = 'local'`.

## Detalhes técnicos

- Erro origina em `src/integrations/supabase/client.server.ts` (validação de env),
  acionado por `src/lib/avatar-sync.server.ts` via `src/lib/avatar-backfill.functions.ts`.
- Nenhuma mudança de UI necessária; o tratamento de erro/toast em `UserManagement` já está correto.
- Escopo isolado ao módulo de avatares: nenhum outro módulo é afetado.
