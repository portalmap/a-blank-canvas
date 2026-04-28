## Liberar comentários do feed para todos os usuários

### Diagnóstico

O componente `FeedPostItem.tsx` já mostra a área de comentário (`Textarea` + botão de enviar) para qualquer usuário autenticado — não há gate no frontend.

A causa do problema é a **RLS policy** atual em `feed_post_comments`:

```sql
"Users can create comments" (INSERT)
WITH CHECK:
  EXISTS (
    SELECT 1 FROM feed_posts p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = post_id AND wm.user_id = auth.uid()
  )
  AND author_id = auth.uid()
```

Ela exige que quem comenta seja membro registrado em `workspace_members` do workspace do post. Qualquer usuário autenticado fora desse vínculo (ou com cache de sessão sem membership atualizada) recebe erro silencioso da RLS, e nada é inserido — exatamente o sintoma "ninguém consegue comentar".

A policy de SELECT também filtra por membership, então usuários que não fossem membros nem veriam os posts — mas o problema relatado é específico de comentar.

### Plano

1. **Migração de banco** (`supabase/migrations/`) — substituir a policy de INSERT por uma versão mais permissiva, mantendo apenas o requisito mínimo de segurança (`author_id = auth.uid()`):

   ```sql
   DROP POLICY IF EXISTS "Users can create comments" ON public.feed_post_comments;

   CREATE POLICY "Authenticated users can create comments"
   ON public.feed_post_comments
   FOR INSERT
   TO authenticated
   WITH CHECK (author_id = auth.uid());
   ```

   Assim, qualquer usuário autenticado consegue comentar, contanto que assine o comentário com o próprio `auth.uid()` (proteção contra impersonação).

2. **Mostrar erro real no UI** — em `src/components/home/FeedPostItem.tsx`, ajustar `handleSubmitComment` para exibir a mensagem do erro do Supabase no toast, em vez de um genérico "Erro ao enviar comentário". Isso ajuda a diagnosticar futuros bloqueios de RLS rapidamente.

### Considerações

- As policies de **SELECT**, **DELETE de autor** e **DELETE de admin** ficam inalteradas — apenas o INSERT é liberado.
- A obrigatoriedade `author_id = auth.uid()` garante que ninguém pode comentar se passando por outro usuário.
- Não há mudança visual no feed; o usuário simplesmente passa a conseguir comentar.

### Arquivos afetados

- nova migração SQL em `supabase/migrations/`
- `src/components/home/FeedPostItem.tsx` (apenas a mensagem de erro do toast)