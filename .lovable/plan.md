

## Plano: Corrigir Automação de Atribuição Automática de Responsáveis

### Problema Identificado

A automação de "Atribuir responsável" ao criar uma tarefa não está funcionando porque o código tenta inserir colunas que **não existem** na tabela `task_assignees`.

**Análise do erro:**
- A tarefa foi criada corretamente na lista "Designer/Edição de Vídeo | Empresa Teste"
- A automação existe e está ativa com trigger `on_task_created`
- O código em `useApplyAutomations.ts` tenta inserir `source_type` e `source_id` na tabela `task_assignees`
- A tabela `task_assignees` só tem: `id`, `task_id`, `user_id`, `created_at` - **não tem** `source_type` nem `source_id`
- O erro é silenciado pelo uso de `as any`, mas o banco de dados rejeita o insert

**Comparação das tabelas:**
| Tabela | Colunas |
|--------|---------|
| `task_followers` | id, task_id, user_id, created_at, **source_type**, **source_id** |
| `task_assignees` | id, task_id, user_id, created_at |

---

### Solução

Há duas opções:

#### Opção 1: Adicionar colunas faltantes no banco (Recomendada)
Adicionar as colunas `source_type` e `source_id` na tabela `task_assignees` para manter consistência com `task_followers`.

#### Opção 2: Remover campos do código
Remover `source_type` e `source_id` do insert no `useApplyAutomations.ts`.

**Recomendo a Opção 1** pois mantém o rastreamento de origem (qual automação atribuiu o responsável).

---

### Arquivos a Modificar

| Tipo | Arquivo/Recurso | Mudança |
|------|-----------------|---------|
| Banco de Dados | `task_assignees` | Adicionar colunas `source_type` e `source_id` |
| Código | `src/hooks/useApplyAutomations.ts` | Pequena correção no tipo do upsert |

---

### Seção Técnica

#### Migration SQL

```sql
-- Adicionar colunas de rastreamento de origem na tabela task_assignees
ALTER TABLE task_assignees 
ADD COLUMN IF NOT EXISTS source_type text,
ADD COLUMN IF NOT EXISTS source_id uuid;

-- Comentário para documentação
COMMENT ON COLUMN task_assignees.source_type IS 'Tipo do escopo de origem da automação (workspace, space, folder, list)';
COMMENT ON COLUMN task_assignees.source_id IS 'ID do escopo de origem da automação';
```

#### Correção no useApplyAutomations.ts

Remover o `as any` e ajustar o insert para trabalhar corretamente:

```typescript
// Antes (com erro silenciado):
const { error: assignError } = await supabase
  .from('task_assignees')
  .upsert({
    task_id: task.id,
    user_id: userId,
    source_type: automation.scope_type,
    source_id: automation.scope_id || automation.workspace_id,
  } as any, { onConflict: 'task_id,user_id' });

// Depois (funcionando corretamente):
const { error: assignError } = await supabase
  .from('task_assignees')
  .upsert({
    task_id: task.id,
    user_id: userId,
    source_type: automation.scope_type,
    source_id: automation.scope_id || automation.workspace_id,
  }, { onConflict: 'task_id,user_id' });
```

---

### Resultado Esperado

Após a implementação:
1. A tabela `task_assignees` terá as mesmas colunas de rastreamento que `task_followers`
2. Ao criar uma tarefa na lista "Designer/Edição de Vídeo | Empresa Teste", os 3 responsáveis serão atribuídos automaticamente
3. O sistema saberá qual automação/escopo originou cada atribuição

