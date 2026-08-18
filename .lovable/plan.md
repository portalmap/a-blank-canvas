# Fechar os pontos que faltaram na sincronização de avatar (SSO Hub)

A maior parte já está no ar: colunas `hub_user_id`, `avatar_path`, `avatar_origem` em `profiles`, políticas do bucket `avatars` por dono da pasta ou admin, e a sincronização isolada (try/catch) dentro do resgate do code no SSO, que respeita `avatar_origem = 'local'` e não apaga foto quando `avatar_path` vem nulo.

O que ainda falta, conforme o prompt completo:

## 1. Precedência do upload de admin (correção real)

Quando um admin troca a foto de outro usuário, a marcação `avatar_origem = 'local'` hoje é feita por um `update` direto em `profiles`, que depende de política de RLS de admin nessa tabela. Se ela não permitir, a origem continua `hub` e o Hub sobrescreve a foto no próximo login — exatamente o que a regra de precedência proíbe.

Ajuste: a RPC de admin passa a gravar, na mesma chamada, `avatar_url`, `avatar_path = null` e `avatar_origem = 'local'`, de forma atômica e sem depender de RLS.

## 2. Hook único de leitura do avatar

Existe `useProfile` (lê `avatar_url`, `avatar_path`, `avatar_origem`), mas as telas de perfil/edição ainda recebem a URL por prop de outras consultas. Padronizar essas duas telas para consumir o hook único, mantendo os hooks de listagem (membros, responsáveis) como estão — eles só listam avatares de terceiros.

## 3. Fallback com iniciais garantido

Criar um componente único de exibição (`UserAvatar`) que sempre renderiza `AvatarFallback` com as iniciais do nome quando a URL falha ou está vazia, e usá-lo nas telas de perfil e edição de usuário. Assim uma URL assinada quebrada nunca deixa um círculo vazio.

## 4. Conferência final

- Confirmar que o bucket `avatars` está privado.
- Confirmar limite de 2 MB e tipos PNG/JPG/WEBP no upload local (já aplicado) e validade longa da URL assinada local.

## Detalhes técnicos

- Migration: `create or replace function public.update_user_avatar_as_admin(target_user_id uuid, new_avatar_url text)` gravando também `avatar_origem = 'local'` e `avatar_path = null`, mantendo `security definer`, `set search_path = public` e a checagem de admin existente.
- `src/components/settings/AvatarUpload.tsx`: remover o `update` best-effort de `avatar_origem` no caminho admin (a RPC passa a cuidar disso).
- Novo `src/components/ui/user-avatar.tsx`: `Avatar` + `AvatarImage` + `AvatarFallback` com iniciais.
- `src/components/settings/UserProfile.tsx` e `UserEditDialog.tsx`: usar `useProfile` e `UserAvatar`.
- Nenhuma mudança no `sso-exchange` além do que já está publicado.
