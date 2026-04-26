

## Diagnóstico honesto

Encontrei dois problemas reais e uma confusão que precisa ser esclarecida:

### 1. Comentários "não funcionam" — motivo real
Não é um bug de RLS. A função de adicionar comentário **simplesmente nunca foi construída na interface**. O botão atual chama `onComment` que só dispara um toast `"Funcionalidade de comentários em breve"`. A mutation `addComment` já existe no hook, mas nada na UI a usa. Não há campo de texto para digitar comentário, nem listagem de comentários existentes.

### 2. RLS de criação de post hoje
A política atual permite que **qualquer membro do workspace** crie post no feed. Para restringir a "admin acima" (admin do workspace + global_owner + owner), preciso alterar a policy de INSERT de `feed_posts`.

### 3. Esclarecimento importante sobre "admin acima"
No sistema existem dois níveis distintos de admin:
- **Workspace admin** (tabela `workspace_members.role = 'admin'`) — admin daquele workspace específico
- **System admin** (tabela `user_roles.role IN ('global_owner','owner')`) — admin global do sistema

Vou interpretar "admin acima" como: **workspace admin + global_owner + owner**. Se você quis dizer apenas global_owner/owner (excluindo admin de workspace), me avisa antes de aprovar.

---

## Plano de implementação

### Backend (migration SQL)

**1. Atualizar policy de INSERT em `feed_posts`** — restringir criação a admin do workspace OU system admin (global_owner/owner):
```sql
DROP POLICY "Members can create feed posts" ON feed_posts;
CREATE POLICY "Only admins can create feed posts" ON feed_posts FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND (
      is_workspace_admin(auth.uid(), workspace_id)
      OR is_system_admin(auth.uid())
    )
  );
```

**2. Adicionar policy de DELETE para admins em `feed_posts`** (mantendo a do autor):
```sql
CREATE POLICY "Admins can delete any feed post" ON feed_posts FOR DELETE
  USING (
    is_workspace_admin(auth.uid(), workspace_id)
    OR is_system_admin(auth.uid())
  );
```

**3. Adicionar policy de DELETE para admins em `feed_post_comments`** (mantendo a do autor):
```sql
CREATE POLICY "Admins can delete any comment" ON feed_post_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM feed_posts p
      WHERE p.id = feed_post_comments.post_id
        AND (is_workspace_admin(auth.uid(), p.workspace_id) OR is_system_admin(auth.uid()))
    )
  );
```

### Frontend

**4. `useFeedPosts.ts`** — adicionar:
- `canCreatePost` (boolean) — verifica se usuário atual é admin do workspace OU system admin via `workspace_members` + `user_roles`
- `deletePost(postId)` mutation
- `deleteComment(commentId)` mutation
- `usePostComments(postId)` query separada (lazy load, só busca quando expande comentários) com join em `profiles`

**5. `FeedCard.tsx`** — esconder/desabilitar `CreatePostDialog` quando `!canCreatePost`. Para não-admins, sequer renderiza o botão "Nova publicação".

**6. `FeedPostItem.tsx`** — refatorar para:
- Ícone de lixeira (DropdownMenu de 3 pontinhos) no canto superior direito do post, visível apenas para autor OU admin/system admin. Confirmação via AlertDialog antes de excluir.
- Clique em "comentar" expande/recolhe seção de comentários inline (state local `isCommentsOpen`).
- Seção de comentários: lista existentes com avatar+nome+texto+timestamp, cada comentário com lixeira para autor/admin, e um campo de input no rodapé com botão "Enviar".

### O que não muda
- Curtidas continuam funcionando exatamente como hoje.
- Visualização do feed (SELECT) continua aberta a todos os membros do workspace.
- Posts já existentes ficam intactos.

### Edge cases
- Post sem comentários → mostra "Seja o primeiro a comentar" no painel expandido.
- Usuário comum tentando publicar → nem vê o campo (UI) e, se forçar via API, RLS bloqueia (defesa em profundidade).
- Excluir post → comentários e reações são apagadas em cascata? **Preciso verificar se há ON DELETE CASCADE** nas FKs de `feed_post_comments.post_id` e `feed_post_reactions.post_id`. Se não houver, incluo `ON DELETE CASCADE` na migration.

