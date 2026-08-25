# Diagnóstico — Receber decisão do cliente via Hub (aprovado/devolvido)

Diagnóstico apenas; nada será alterado sem aprovação.

## PARTE A — Comentário na tarefa

### 1. Tabelas e colunas

**`task_comments`** (o comentário em si):
- `id` uuid, `task_id` uuid NOT NULL (FK → tasks, cascade)
- `author_id` uuid **NOT NULL** (sem FK explícita, mas a UI faz join em `profiles`)
- `content` text NOT NULL
- `created_at` / `updated_at` timestamptz
- Opcionais de fluxo de atribuição: `assignee_id`, `resolved_at`, `resolved_by`

**`task_activities`** (o que alimenta a aba "Atividade" da tarefa — sem isso o comentário não aparece no feed):
- `task_id` uuid NOT NULL, `user_id` uuid NOT NULL
- `activity_type` text (valores em uso: `comment.created`, `assignment.created`, `attachment.added`, `assignment.resolved`)
- `field_name`, `old_value`, `new_value` text
- `metadata` jsonb (guarda `comment_id`, etc.), `created_at`

### 2. Campos obrigatórios
- `task_comments`: `task_id`, `author_id`, `content` (demais têm default/NULL).
- Para aparecer na aba Atividade: inserir também em `task_activities` com `activity_type='comment.created'` e `metadata.comment_id`.

### 3. Autor do comentário
- `author_id` é obrigatório e aponta para um usuário do MAP Flow — **não existe** comentário "sem autor".
- Sugestão (cliente não é usuário do sistema): usar um **autor técnico** (ex.: criador do workspace, mesmo padrão do `calendario.publicar`) e gravar o nome do cliente **no texto** (ex.: `Cliente João Silva aprovou: ...`) e/ou em `metadata` da atividade (`{ cliente_nome, origem: 'hub', decisao: 'aprovado' }`).

## PARTE B — Marcar devolução

### 4. Campo existente?
**Não existe** nenhuma coluna em `tasks` para "devolvida pelo cliente" (sem boolean/flag/contador; apenas `status_id`, `external_post_ref`, etc.).

### 5. Sugestão (sem criar ainda)
- Coluna nova em `tasks`: `devolvida_pelo_cliente boolean NOT NULL DEFAULT false` — simples e suficiente se a regra é "marca uma vez".
- Alternativas, se quiserem histórico: `cliente_devolucoes_count int DEFAULT 0` (contador) ou `devolvida_pelo_cliente_at timestamptz` (marca + data da última devolução). A recomendação mínima é o boolean; se houver chance de múltiplas devoluções, o contador+timestamp atende melhor.

### 6. Identificação da tarefa
- O Portal/Hub recebeu o **`task_id` (tasks.id)** na resposta do `calendario.publicar` (campo `task_id` em cada item de `resultados`) — então basta enviar esse id de volta e casa 1:1 com `tasks.id`.
- Também existe `tasks.external_post_ref` (ref externa do post) como chave alternativa caso o Hub prefira não guardar o UUID.
