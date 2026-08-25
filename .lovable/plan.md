# Plano — Receber decisão do cliente no hub-inbox (`calendario.post.aprovado` / `calendario.post.reprovado`)

Nada é aplicado sem aprovação. `calendario.publicar`, `tarefa.listar_para_aprovacao`, `diagnostico.ping` e o SSO ficam intactos — apenas adições no mesmo switch da `hub-inbox`.

## 1. Migration — contador de devoluções em `tasks`

```sql
ALTER TABLE public.tasks
  ADD COLUMN cliente_devolucoes_count integer NOT NULL DEFAULT 0;
```
- Só adiciona a coluna; nenhuma policy/trigger muda (a coluna herda as regras atuais de `tasks`).
- Sem dados alterados — todas as tarefas começam com 0.

## 2. Novo handler na `hub-inbox` (módulo isolado)

### Entrada (validada com Zod próprio)
- Assunto: `calendario.post.aprovado` ou `calendario.post.reprovado` — **modo `entrega`** (outro modo → `modo_nao_suportado` 422).
- Schema raiz: `aprovador_nome` (string obrigatória), `tasks` (array, mín. 1).
- Cada item: `id` (string uuid, obrigatório), `comentario` (string, opcional/pode vir vazio).

### Fluxo (depois do auth Bearer + CORS já existentes)
1. **Idempotência por mensagem**: se `body.id` já existir em `hub_inbox_processed` com `resposta`, devolve a resposta guardada — **sem criar comentário nem somar contador de novo**. (Mesmo mecanismo do `calendario.publicar`.)
2. Para **cada item** de `tasks`:
   a. **Localizar a tarefa**: `tasks.id = item.id`. Não achou → resultado do item: `{ id, status: "erro", error: "task_nao_encontrada" }` e segue os demais.
   b. **Comentário (sempre, nos dois assuntos)**:
      - `task_comments`: `task_id` = tarefa, `author_id` = **autor técnico** (criador do workspace da tarefa, mesma função `resolverAutor` do `calendario.publicar`), `content` =
        - aprovado: `Cliente {aprovador_nome} aprovou.` (+ ` Comentário: {comentario}` se houver)
        - reprovado: `Cliente {aprovador_nome} devolveu. Comentário: {comentario}`
      - `task_activities`: `task_id`, `user_id` = autor técnico, `activity_type = 'comment.created'`, `metadata = { comment_id, origem: 'hub', decisao: 'aprovado'|'devolvido', aprovador_nome }` → comentário aparece na aba Atividade.
   c. **Contador (só no reprovado)**: `UPDATE tasks SET cliente_devolucoes_count = cliente_devolucoes_count + 1 WHERE id = ...` — incremento atômico no banco; no aprovado não toca.
   d. Resultado do item: `{ id, status: "processado", comment_id, cliente_devolucoes_count? }`.
3. Gravar a resposta em `hub_inbox_processed` (`mensagem_id`, `assunto`, `resposta`) e responder 200 com os resultados por item.

### Por que o contador não sobe em reenvio
A guarda de idempotência (passo 1) acontece **antes** de qualquer escrita: mensagem já processada retorna a resposta salva sem tocar em `task_comments`, `task_activities` ou no contador.

## 3. O que NÃO muda
- `verify_jwt=false` e a validação `Authorization: Bearer <HUB_INBOX_TOKEN>` (timing-safe) — mantidos.
- CORS, log em `relay_diagnostico_log`, e os handlers de `diagnostico.ping`, `tarefa.listar_para_aprovacao` e `calendario.publicar` — intocados (o novo código é um módulo à parte, adicionado ao switch).
- SSO e frontend — nenhuma alteração.
- Nenhum envio de volta ao Portal/Social Flow.

## 4. Arquivos
- 1 migration (coluna `cliente_devolucoes_count`).
- `supabase/functions/hub-inbox/index.ts` — novo schema Zod + handler `handleCalendarioDecisao` + 2 entradas no switch de assuntos.
- Deploy da `hub-inbox` após a alteração.
