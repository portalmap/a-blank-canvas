

## Plano: Corrigir Salvamento da Data de Início no Template de Tarefas

### Problema Identificado

O campo "Data de Início" não está sendo salvo quando o usuário altera porque há uma **desconexão de tipos** entre os componentes:

1. **`TemplateTaskDialog`** exporta `TaskData` com campos de recorrência (`startDateRecurrence`, `dueDateRecurrence`)
2. **`SpaceTemplateEditor`** usa a interface `TaskItem` que **não possui** esses campos
3. **`handleTaskSave`** não aceita os campos de recorrência na assinatura
4. O banco de dados (`space_template_tasks`) **não possui** colunas para recorrência

### Fluxo Atual (Quebrado)

```text
TemplateTaskDialog.onSave({
  startDateOffset: 5,
  startDateRecurrence: { type: 'weekly', dayOfWeek: 'monday' },  ← IGNORADO!
  dueDateOffset: 10,
  dueDateRecurrence: null,
  ...
})
    ↓
SpaceTemplateEditor.handleTaskSave({
  startDateOffset,
  dueDateOffset,
  // startDateRecurrence NÃO É CAPTURADO!
})
    ↓
setTasks([...tasks, { ...taskData }])  ← Dados incompletos
    ↓
Banco de dados: start_date_offset = null (perdido!)
```

### Solução Proposta

#### Opção A: Adicionar Suporte Completo a Recorrência (Complexo)
- Adicionar colunas no banco: `start_date_recurrence JSONB`, `due_date_recurrence JSONB`
- Atualizar todas as interfaces
- Modificar hooks de criação/atualização

#### Opção B: Corrigir Apenas o Offset (Simples e Imediato)
- O problema pode ser que os dados de offset estão sendo corretamente passados mas não salvos
- Verificar se há algum bug no fluxo de salvamento

### Diagnóstico Detalhado

Após análise, o código **parece correto** para o modo "offset":
- Linha 284 do dialog: `startDateOffset: startDateMode === 'offset' && startDateOffset !== '' ? parseInt(startDateOffset) : null`
- Linha 228 do editor: `{ ...t, ...taskData }` deveria mesclar corretamente
- Linha 298 do hook: `start_date_offset: t.startDateOffset` deveria salvar

O problema provavelmente está em um dos seguintes pontos:
1. O campo `startDateOffset` está vindo como `undefined` em vez de `null`
2. Há um problema de tipagem que causa perda de dados

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/settings/SpaceTemplateEditor.tsx` | Atualizar interface `TaskItem` e `handleTaskSave` para incluir campos de recorrência |
| `src/hooks/useSpaceTemplates.ts` | Adicionar campos de recorrência ao `TaskInput` e persistência |

---

### Implementação

#### 1. SpaceTemplateEditor.tsx - Atualizar Interface TaskItem

```typescript
interface DateRecurrence {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  monthlyMode?: 'first_day' | 'last_day' | 'specific_day';
  dayOfMonth?: number;
  repeatForever?: boolean;
  skipWeekends?: boolean;
  onCompleteAction?: 'create_new_task' | 'update_status';
  resetStatusId?: string;
  triggerOnStatusId?: string;
}

interface TaskItem {
  tempId: string;
  listTempId: string;
  title: string;
  description: string;
  priority: string;
  startDateOffset: number | null;
  dueDateOffset: number | null;
  startDateRecurrence?: DateRecurrence | null;  // ADICIONAR
  dueDateRecurrence?: DateRecurrence | null;    // ADICIONAR
  statusTemplateItemId: string | null;
  estimatedTime: number | null;
  isMilestone: boolean;
  tagNames: string[];
}
```

#### 2. SpaceTemplateEditor.tsx - Atualizar handleTaskSave

```typescript
const handleTaskSave = (taskData: { 
  title: string; 
  description: string; 
  priority: string;
  startDateOffset: number | null;
  dueDateOffset: number | null;
  startDateRecurrence?: DateRecurrence | null;  // ADICIONAR
  dueDateRecurrence?: DateRecurrence | null;    // ADICIONAR
  statusTemplateItemId: string | null;
  estimatedTime: number | null;
  isMilestone: boolean;
  tagNames: string[];
}) => {
  // ... resto do código permanece igual
};
```

#### 3. SpaceTemplateEditor.tsx - Atualizar handleSave (persistência)

```typescript
const tasksData = tasks.map((t, i) => ({
  listRefIndex: listIndexMap[t.listTempId],
  title: t.title,
  description: t.description || null,
  priority: t.priority,
  order_index: i,
  start_date_offset: t.startDateOffset,
  due_date_offset: t.dueDateOffset,
  start_date_recurrence: t.startDateRecurrence || null,  // ADICIONAR
  due_date_recurrence: t.dueDateRecurrence || null,      // ADICIONAR
  status_template_item_id: t.statusTemplateItemId,
  estimated_time: t.estimatedTime,
  is_milestone: t.isMilestone,
  tag_names: t.tagNames.length > 0 ? t.tagNames : null,
}));
```

#### 4. SpaceTemplateEditor.tsx - Atualizar carregamento de tarefas

```typescript
const loadedTasks = (template.tasks || []).map((t, i) => ({
  tempId: `task-${i}`,
  listTempId: listMap[t.list_ref_id],
  title: t.title,
  description: t.description || '',
  priority: t.priority,
  startDateOffset: t.start_date_offset ?? null,
  dueDateOffset: t.due_date_offset ?? null,
  startDateRecurrence: t.start_date_recurrence ?? null,  // ADICIONAR
  dueDateRecurrence: t.due_date_recurrence ?? null,      // ADICIONAR
  statusTemplateItemId: t.status_template_item_id ?? null,
  estimatedTime: t.estimated_time ?? null,
  isMilestone: t.is_milestone ?? false,
  tagNames: t.tag_names ?? [],
}));
```

#### 5. useSpaceTemplates.ts - Atualizar TaskInput

```typescript
interface DateRecurrence {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: string;
  monthlyMode?: string;
  dayOfMonth?: number;
  repeatForever?: boolean;
  skipWeekends?: boolean;
  onCompleteAction?: string;
  resetStatusId?: string;
  triggerOnStatusId?: string;
}

interface TaskInput {
  listRefIndex: number;
  title: string;
  description: string | null;
  priority: string;
  order_index: number;
  start_date_offset?: number | null;
  due_date_offset?: number | null;
  start_date_recurrence?: DateRecurrence | null;  // ADICIONAR
  due_date_recurrence?: DateRecurrence | null;    // ADICIONAR
  status_template_item_id?: string | null;
  estimated_time?: number | null;
  is_milestone?: boolean;
  tag_names?: string[] | null;
}
```

#### 6. useSpaceTemplates.ts - Atualizar SpaceTemplateTask

```typescript
export interface SpaceTemplateTask {
  id: string;
  template_id: string;
  list_ref_id: string;
  title: string;
  description: string | null;
  priority: string;
  order_index: number;
  start_date_offset: number | null;
  due_date_offset: number | null;
  start_date_recurrence?: Record<string, unknown> | null;  // ADICIONAR
  due_date_recurrence?: Record<string, unknown> | null;    // ADICIONAR
  status_template_item_id: string | null;
  estimated_time: number | null;
  is_milestone: boolean;
  tag_names: string[] | null;
}
```

#### 7. useSpaceTemplates.ts - Atualizar criação/atualização de tasks

Nas funções `useCreateSpaceTemplate` e `useUpdateSpaceTemplate`, adicionar os campos de recorrência:

```typescript
tasks.map((t) => ({
  template_id: template.id,
  list_ref_id: listIdMap[t.listRefIndex],
  title: t.title,
  description: t.description,
  priority: t.priority,
  order_index: t.order_index,
  start_date_offset: t.start_date_offset ?? null,
  due_date_offset: t.due_date_offset ?? null,
  start_date_recurrence: t.start_date_recurrence ?? null,  // ADICIONAR
  due_date_recurrence: t.due_date_recurrence ?? null,      // ADICIONAR
  status_template_item_id: t.status_template_item_id ?? null,
  estimated_time: t.estimated_time ?? null,
  is_milestone: t.is_milestone ?? false,
  tag_names: t.tag_names ?? null,
}))
```

---

### Pré-requisito: Migração de Banco de Dados

Antes de implementar, é necessário adicionar as colunas JSONB na tabela `space_template_tasks`:

```sql
ALTER TABLE space_template_tasks 
ADD COLUMN IF NOT EXISTS start_date_recurrence JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS due_date_recurrence JSONB DEFAULT NULL;
```

---

### Resultado Esperado

1. O usuário poderá configurar "Data de Início" como:
   - **Dias após criação** (offset numérico)
   - **Recorrente** (semanal, quinzenal, mensal)

2. Ambos os modos serão salvos corretamente no banco de dados

3. Ao editar uma tarefa existente, os valores serão carregados corretamente

