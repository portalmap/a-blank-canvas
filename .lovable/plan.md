

# Correção: Portal não carrega imagens das tarefas

## Causa

A mudança recente no `useTaskAttachments.ts` passou a salvar **paths relativos** no campo `file_url` (ex: `userId/taskId/file.jpg`) em vez de URLs públicas completas. O frontend resolve isso com signed URLs, mas a **API Gateway** retorna o path cru — o Portal tenta usar como URL e falha.

## Correção

### Editar `supabase/functions/api-gateway/index.ts`

**1. Criar helper `resolveAttachmentUrls`** — recebe o client Supabase e um array de attachments, gera signed URLs (1h) para cada `file_url` que não começa com `http`. Attachments antigos com URL completa ficam intactos.

**2. Criar helper `resolveTasksAttachments`** — wrapper que percorre um array de tarefas e aplica o helper acima no campo `task_attachments` de cada uma.

**3. Aplicar nos 4 pontos que retornam attachments:**

| Endpoint | Linha aprox. | O que fazer |
|---|---|---|
| `GET /tasks/:id` | 444 | Resolver `data.task_attachments` antes de retornar |
| `GET /tasks?tag_name=...` | 495 | Resolver attachments do array `tasks` antes de retornar |
| `GET /attachments` (por id) | 1261 | Resolver o `file_url` do attachment individual |
| `GET /attachments` (por task_id) | 1269 | Resolver `file_url` de cada attachment do array |

**Nota:** A listagem padrão `GET /tasks` (linha 499) **não inclui** `task_attachments` no select, então não precisa de alteração.

## O que NÃO muda

- Nenhum outro endpoint ou função é alterado
- Attachments com URL completa (legado) continuam funcionando
- Nenhuma alteração no Portal MAP
- Nenhuma alteração no frontend do Flow

## Arquivo

- 1 editado: `supabase/functions/api-gateway/index.ts`

