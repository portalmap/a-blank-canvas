

## Plano: Tarefa Completa no Template de Space

### Situação Atual

A tabela `space_template_tasks` só possui 3 campos configuráveis:
- **Título** 
- **Descrição**
- **Prioridade**

Uma tarefa real no sistema (`tasks`) possui muitos mais campos:
- Data de início
- Data de entrega
- Status inicial
- Responsável padrão
- Etiquetas (tags)
- Tempo estimado
- É marco (milestone)

---

### Solução Proposta

Expandir a tabela `space_template_tasks` para suportar os campos adicionais e atualizar o dialog para permitir sua configuração.

---

### Novos Campos no Banco de Dados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `start_date_offset` | INTEGER | Dias após criação do space para data de início |
| `due_date_offset` | INTEGER | Dias após criação do space para data de entrega |
| `status_template_item_id` | UUID | Status inicial (do template de status) |
| `estimated_time` | INTEGER | Tempo estimado em minutos |
| `is_milestone` | BOOLEAN | Marcar como marco |
| `tag_names` | TEXT[] | Array com nomes das tags a serem aplicadas |

Nota: Usamos **offsets de data** (ex: +5 dias) ao invés de datas fixas, pois cada space criado terá datas relativas à sua data de criação.

---

### Fluxo de Mapeamento

```text
┌─────────────────────────────────────────────────────────────────┐
│  TEMPLATE TASK                        TASK REAL                 │
├─────────────────────────────────────────────────────────────────┤
│  start_date_offset: 0          →   start_date: 2025-01-27      │
│  due_date_offset: 7            →   due_date: 2025-02-03        │
│  status_template_item_id: X    →   status_id: (mapeado)        │
│  tag_names: ["urgente"]        →   task_tag_relations criadas  │
│  estimated_time: 120           →   estimated_time: 120         │
│  is_milestone: true            →   is_milestone: true          │
└─────────────────────────────────────────────────────────────────┘
```

---

### Interface do Dialog Atualizada

```text
┌──────────────────────────────────────────────────┐
│  Configurar Tarefa                          [×]  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Título *                                        │
│  ┌────────────────────────────────────────────┐  │
│  │ Otimização de Público                      │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Descrição                                       │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │ Instruções detalhadas...                   │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ Prioridade      │  │ Status Inicial      │    │
│  │ ● Média      ▼  │  │ 📋 A fazer      ▼   │    │
│  └─────────────────┘  └─────────────────────┘    │
│                                                  │
│  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ Início (dias)   │  │ Entrega (dias)      │    │
│  │ +0              │  │ +7                  │    │
│  └─────────────────┘  └─────────────────────┘    │
│  (após criação)       (após criação)             │
│                                                  │
│  ┌─────────────────┐  ┌─────────────────────┐    │
│  │ Tempo estimado  │  │ ☐ É um marco        │    │
│  │ 2h              │  │                     │    │
│  └─────────────────┘  └─────────────────────┘    │
│                                                  │
│  Etiquetas                                       │
│  ┌────────────────────────────────────────────┐  │
│  │ [urgente ×] [revisar ×]  + Adicionar       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│                    [Cancelar]  [Salvar]          │
└──────────────────────────────────────────────────┘
```

---

### Migration SQL

```sql
-- Adicionar novos campos à tabela space_template_tasks
ALTER TABLE public.space_template_tasks
ADD COLUMN start_date_offset INTEGER,
ADD COLUMN due_date_offset INTEGER,
ADD COLUMN status_template_item_id UUID REFERENCES public.status_template_items(id) ON DELETE SET NULL,
ADD COLUMN estimated_time INTEGER,
ADD COLUMN is_milestone BOOLEAN DEFAULT false,
ADD COLUMN tag_names TEXT[];
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| **Migration** | Adicionar novos campos à tabela |
| `src/components/settings/TemplateTaskDialog.tsx` | Expandir formulário com novos campos |
| `src/components/settings/SpaceTemplateEditor.tsx` | Atualizar interface de TaskItem |
| `src/hooks/useSpaceTemplates.ts` | Incluir novos campos no save/load |

---

### Detalhes de Implementação

#### 1. TemplateTaskDialog Expandido

Novos estados:
```typescript
const [startDateOffset, setStartDateOffset] = useState<number | null>(null);
const [dueDateOffset, setDueDateOffset] = useState<number | null>(null);
const [statusTemplateItemId, setStatusTemplateItemId] = useState<string | null>(null);
const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
const [isMilestone, setIsMilestone] = useState(false);
const [tagNames, setTagNames] = useState<string[]>([]);
```

Props adicionais:
```typescript
interface TemplateTaskDialogProps {
  // ... existentes
  statusTemplateItems?: StatusTemplateItem[]; // Para popular o select de status
  availableTags?: string[]; // Nomes de tags do workspace
}
```

#### 2. TaskItem Atualizado

```typescript
interface TaskItem {
  tempId: string;
  listTempId: string;
  title: string;
  description: string;
  priority: string;
  // Novos campos
  startDateOffset: number | null;
  dueDateOffset: number | null;
  statusTemplateItemId: string | null;
  estimatedTime: number | null;
  isMilestone: boolean;
  tagNames: string[];
}
```

#### 3. Renderização na Lista

Mostrar indicadores visuais:
```typescript
const renderTask = (task: TaskItem) => {
  return (
    <div className="flex items-center gap-2 ...">
      <CheckSquare className="h-4 w-4" />
      <span>{task.title}</span>
      
      {task.dueDateOffset !== null && (
        <Badge variant="outline" className="text-xs">
          +{task.dueDateOffset}d
        </Badge>
      )}
      
      {task.isMilestone && (
        <Flag className="h-3 w-3 text-amber-500" />
      )}
      
      {task.tagNames.length > 0 && (
        <Badge className="text-xs">{task.tagNames.length} tags</Badge>
      )}
      
      <PriorityBadge priority={task.priority} />
    </div>
  );
};
```

---

### Comportamento das Datas

As datas são **offsets relativos** à data de criação do space:

| Offset | Significado |
|--------|-------------|
| `0` | No dia da criação |
| `7` | 7 dias após criação |
| `-3` | 3 dias antes (já vencido) |
| `null` | Sem data definida |

Quando o space é criado:
```typescript
const startDate = startDateOffset !== null 
  ? addDays(new Date(), startDateOffset).toISOString().split('T')[0]
  : null;
```

---

### Resultado Esperado

1. Dialog de tarefa com TODOS os campos configuráveis
2. Offsets de data para datas relativas
3. Seleção de status inicial do template
4. Seleção de tags por nome
5. Configuração de tempo estimado e marco
6. Visualização compacta na lista de tarefas do template
7. Criação de tarefas completas quando o space é gerado

