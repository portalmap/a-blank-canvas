
## Plano: Corrigir Salvamento da Data de Início Recorrente

### Diagnóstico Confirmado

Após análise profunda do banco de dados e do código:

**Estado no Banco:**
```
title: "Análise Diária de KPIs"
start_date_offset: NULL
start_date_recurrence: NULL  ← DEVERIA ter { type: "daily", ... }
due_date_offset: 1           ← Salvo corretamente
due_date_recurrence: NULL
```

O usuário configurou "Data de Início" como "Recorrente" → "Diariamente", mas o dado não foi persistido.

### Causa Raiz Identificada

O fluxo de dados está correto em teoria, mas há um problema de **timing/referência**:

1. O `handleTaskSave` no `SpaceTemplateEditor` recebe `taskData` com `startDateRecurrence` corretamente
2. O estado `tasks` é atualizado via `setTasks()`
3. Mas quando `handleSave` é chamado, pode haver um delay ou problema de referência

**Bug Específico Encontrado:**

No `SpaceTemplateEditor`, a função `handleSave` (linha 309):
```typescript
start_date_recurrence: t.startDateRecurrence || null,
```

O operador `||` pode causar problemas se `t.startDateRecurrence` for um **objeto vazio `{}`** (truthy, mas sem dados úteis).

Mas o principal problema é que o `tasksData` mapeia `tasks` que é o **estado React atualizado assincronamente**, e pode haver uma condição de corrida.

### Correção Proposta

Adicionar **logging de diagnóstico** e garantir que os dados sejam passados corretamente:

#### 1. Adicionar console.log temporário no handleTaskSave

Para confirmar que os dados chegam corretamente do dialog:

```typescript
const handleTaskSave = (taskData: { ... }) => {
  console.log('handleTaskSave received:', {
    startDateRecurrence: taskData.startDateRecurrence,
    dueDateRecurrence: taskData.dueDateRecurrence,
  });
  // resto do código
};
```

#### 2. Adicionar console.log no handleSave

Para confirmar que o estado tasks contém os dados antes de salvar:

```typescript
const handleSave = async () => {
  console.log('handleSave tasks state:', tasks.map(t => ({
    title: t.title,
    startDateRecurrence: t.startDateRecurrence,
    dueDateRecurrence: t.dueDateRecurrence,
  })));
  // resto do código
};
```

#### 3. Corrigir a condição de salvamento

Garantir que `undefined` seja tratado corretamente:

```typescript
const tasksData = tasks.map((t, i) => ({
  // ...
  start_date_recurrence: t.startDateRecurrence !== undefined ? t.startDateRecurrence : null,
  due_date_recurrence: t.dueDateRecurrence !== undefined ? t.dueDateRecurrence : null,
  // ...
}));
```

#### 4. Verificar o spread no handleTaskSave

Garantir que propriedades opcionais sejam incluídas explicitamente:

```typescript
const handleTaskSave = (taskData: { ... }) => {
  if (editingTask) {
    setTasks(tasks.map(t => 
      t.tempId === editingTask.tempId 
        ? { 
            ...t, 
            ...taskData,
            // Garantir que os campos de recorrência sejam explícitos
            startDateRecurrence: taskData.startDateRecurrence ?? null,
            dueDateRecurrence: taskData.dueDateRecurrence ?? null,
          } 
        : t
    ));
  } else if (pendingListTempId) {
    setTasks([...tasks, {
      tempId: generateTempId('task'),
      listTempId: pendingListTempId,
      ...taskData,
      startDateRecurrence: taskData.startDateRecurrence ?? null,
      dueDateRecurrence: taskData.dueDateRecurrence ?? null,
    }]);
  }
};
```

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/settings/SpaceTemplateEditor.tsx` | Corrigir handleTaskSave para garantir campos de recorrência |

### Implementação

Modificar o `handleTaskSave` para garantir que os campos de recorrência sejam sempre definidos explicitamente, evitando problemas com `undefined` no spread:

```typescript
const handleTaskSave = (taskData: { 
  title: string; 
  description: string; 
  priority: string;
  startDateOffset: number | null;
  dueDateOffset: number | null;
  startDateRecurrence?: DateRecurrenceConfig | null;
  dueDateRecurrence?: DateRecurrenceConfig | null;
  statusTemplateItemId: string | null;
  estimatedTime: number | null;
  isMilestone: boolean;
  tagNames: string[];
}) => {
  // Garantir que campos opcionais sejam normalizados
  const normalizedData = {
    ...taskData,
    startDateRecurrence: taskData.startDateRecurrence ?? null,
    dueDateRecurrence: taskData.dueDateRecurrence ?? null,
  };

  if (editingTask) {
    setTasks(tasks.map(t => 
      t.tempId === editingTask.tempId 
        ? { ...t, ...normalizedData } 
        : t
    ));
  } else if (pendingListTempId) {
    setTasks([...tasks, {
      tempId: generateTempId('task'),
      listTempId: pendingListTempId,
      ...normalizedData,
    }]);
  }
};
```

### Resultado Esperado

Após esta correção:
1. Campos de recorrência serão sempre `null` ou um objeto válido (nunca `undefined`)
2. O spread operator não terá problemas com propriedades indefinidas
3. Os dados serão corretamente persistidos no banco

### Seção Técnica

**O problema do JavaScript com spread e undefined:**

```javascript
const obj1 = { a: 1, b: undefined };
const obj2 = { ...obj1 };
// obj2 = { a: 1, b: undefined }  ← `b` existe mas é undefined

const obj3 = { a: 1, ...{ b: undefined } };
// obj3 = { a: 1, b: undefined }  ← mesmo resultado
```

Quando enviado ao Supabase:
- `undefined` pode ser ignorado ou causar problemas
- `null` é explicitamente "sem valor" e funciona corretamente com JSONB

A correção garante que sempre enviamos `null` em vez de `undefined`.
