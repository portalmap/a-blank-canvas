## Objetivo

Permitir que os círculos de perfil (avatares) na lista de membros em `/settings` (e em todo o sistema, já que o componente `Avatar` é reutilizado) exibam fotos reais. Hoje o `UserCard` já está preparado para renderizar a imagem (`AvatarImage src={avatarUrl}`), mas **nunca há `avatar_url` salvo** porque não existe nenhuma tela para fazer upload da foto. As iniciais aparecem apenas como fallback.

## O que será feito

### 1. Backend — bucket de fotos de perfil
- Criar bucket público `avatars` no storage (público para evitar URL assinada e cache problemático em <img>).
- Políticas de storage:
  - Leitura: pública (qualquer pessoa autenticada pode ver fotos de perfis).
  - Upload/Update/Delete: o próprio usuário pode mexer só nos seus arquivos (path = `{user_id}/...`).
  - Admins/Proprietários do workspace podem fazer upload/substituir foto de **qualquer** usuário (atende ao caso de admin subir foto pelos membros que não vão fazer sozinhos).

### 2. Componente novo: `AvatarUpload`
- Pequeno componente reutilizável que mostra o avatar atual + botão "Alterar foto" e "Remover".
- Faz upload para `avatars/{user_id}/avatar-{timestamp}.{ext}` (timestamp evita cache do navegador).
- Atualiza `profiles.avatar_url` com a URL pública.
- Validação: só imagens (jpg/png/webp), máx ~3 MB, redimensiona client-side se >1024px (canvas) para manter o storage leve.

### 3. Onde será integrado
- **`UserProfile.tsx`** (aba "Meu perfil" em /settings): cada usuário gerencia a própria foto.
- **`UserEditDialog.tsx`** (admin editando outro usuário): admin pode subir foto pelo membro. Já tem `<Avatar>` no topo do dialog — vira `AvatarUpload` quando o editor for admin.

### 4. Exibição
Nada a fazer no `UserCard` — assim que `profiles.avatar_url` estiver preenchido, o círculo passa a mostrar a foto automaticamente. O mesmo vale para todos os outros pontos do sistema que já leem `avatar_url` (chat, comentários, responsáveis, etc.).

## Pontos técnicos

- Bucket público é a escolha correta aqui: avatares aparecem em chat, kanban, listas — gerar URL assinada para cada um seria caro e quebraria cache.
- Path com `user_id/` na raiz é obrigatório para as policies funcionarem (`auth.uid()::text = (storage.foldername(name))[1]`).
- Adicionar `?v={timestamp}` na URL quando salvar, para forçar refresh imediato após troca.
- `useAllProfiles`, `useWorkspaceMembers`, `useTaskAssignees` etc. já retornam `avatar_url` — sem mudanças neles.

## O que NÃO muda
- Regras de permissão existentes (feed, tasks, chat, automações) — intactas.
- Nenhuma alteração nos hooks de produtividade, automações ou estrutura do workspace.
- Iniciais continuam como fallback quando o usuário não tem foto.