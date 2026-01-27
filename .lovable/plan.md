

## Plano: Dialog Completo para Configurar Tarefa no Template

### Situação Atual

Ao clicar em "Adicionar Tarefa" no editor de template, uma nova tarefa é criada diretamente com valores padrão e só permite edição inline de:
- **Título** (via input)
- **Prioridade** (via select)

O campo **descrição** já existe no modelo de dados mas não está acessível na interface.

---

### Solução Proposta

Criar um dialog modal que abre ao clicar em "Adicionar Tarefa" (e também ao clicar em uma tarefa existente para editar), permitindo configurar todos os campos disponíveis:
- Título
- Descrição
- Prioridade

---

### Funcionamento

```text
┌─────────────────────────────────────────────────────────────────┐
│  FLUXO DE CRIAÇÃO/EDIÇÃO DE TAREFA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Usuário clica em "+ Adicionar Tarefa"                          │
│     │                                                           │
│     ▼                                                           │
│  ┌──────────────────────────────────────┐                       │
│  │  Dialog: Configurar Tarefa           │                       │
│  ├──────────────────────────────────────┤                       │
│  │  Título *                            │                       │
│  │  ┌────────────────────────────────┐  │                       │
│  │  │ Ex: Revisar briefing           │  │                       │
│  │  └────────────────────────────────┘  │                       │
│  │                                      │                       │
│  │  Descrição                           │                       │
│  │  ┌────────────────────────────────┐  │                       │
│  │  │                                │  │                       │
│  │  │ Instruções detalhadas...       │  │                       │
│  │  │                                │  │                       │
│  │  └────────────────────────────────┘  │                       │
│  │                                      │                       │
│  │  Prioridade                          │                       │
│  │  ┌────────────────────────────────┐  │                       │
│  │  │ ● Média               ▼        │  │                       │
│  │  └────────────────────────────────┘  │                       │
│  │                                      │                       │
│  │         [Cancelar]  [Salvar]         │                       │
│  └──────────────────────────────────────┘                       │
│     │                                                           │
│     ▼                                                           │
│  Tarefa adicionada à lista com todas as informações             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Mudanças Técnicas

#### 1. Novo componente: `TemplateTaskDialog.tsx`

```typescript
interface TemplateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskItem | null; // null = criar nova
  onSave: (task: { title: string; description: string; priority: string }) => void;
}

export const TemplateTaskDialog = ({ open, onOpenChange, task, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
    }
  }, [task, open]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, description, priority });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Revisar briefing do cliente"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instruções ou detalhes da tarefa..."
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {task ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

#### 2. Modificar `SpaceTemplateEditor.tsx`

Adicionar estado para controlar o dialog:

```typescript
const [taskDialogOpen, setTaskDialogOpen] = useState(false);
const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
const [pendingListTempId, setPendingListTempId] = useState<string | null>(null);
```

Modificar a função `addTask`:

```typescript
const openAddTaskDialog = (listTempId: string) => {
  setPendingListTempId(listTempId);
  setEditingTask(null);
  setTaskDialogOpen(true);
};

const openEditTaskDialog = (task: TaskItem) => {
  setEditingTask(task);
  setPendingListTempId(null);
  setTaskDialogOpen(true);
};

const handleTaskSave = (taskData: { title: string; description: string; priority: string }) => {
  if (editingTask) {
    // Atualizar tarefa existente
    setTasks(tasks.map(t => 
      t.tempId === editingTask.tempId 
        ? { ...t, ...taskData } 
        : t
    ));
  } else if (pendingListTempId) {
    // Criar nova tarefa
    setTasks([...tasks, {
      tempId: generateTempId('task'),
      listTempId: pendingListTempId,
      ...taskData,
    }]);
  }
};
```

Modificar `renderTask` para permitir edição ao clicar:

```typescript
const renderTask = (task: TaskItem) => {
  return (
    <div 
      key={task.tempId} 
      className="flex items-center gap-2 pl-10 py-1 cursor-pointer hover:bg-muted/50 rounded"
      onClick={() => openEditTaskDialog(task)}
    >
      <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm flex-1 truncate">{task.title}</span>
      <Badge variant="outline" className="text-xs">
        {PRIORITY_OPTIONS.find(p => p.value === task.priority)?.label}
      </Badge>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6"
        onClick={(e) => {
          e.stopPropagation();
          removeTask(task.tempId);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
```

Modificar o botão "Adicionar Tarefa":

```typescript
<Button
  variant="ghost"
  size="sm"
  className="ml-10 text-muted-foreground"
  onClick={() => openAddTaskDialog(list.tempId)}
>
  <Plus className="h-3 w-3 mr-1" />
  Adicionar Tarefa
</Button>
```

Adicionar o dialog no JSX:

```typescript
<TemplateTaskDialog
  open={taskDialogOpen}
  onOpenChange={setTaskDialogOpen}
  task={editingTask}
  onSave={handleTaskSave}
/>
```

---

### Arquivos a Modificar/Criar

| Arquivo | Ação | Mudança |
|---------|------|---------|
| `src/components/settings/TemplateTaskDialog.tsx` | **CRIAR** | Dialog para criar/editar tarefas |
| `src/components/settings/SpaceTemplateEditor.tsx` | Modificar | Integrar o dialog e ajustar renderização |

---

### Comportamento Final

1. **Criar tarefa**: Clique em "+ Adicionar Tarefa" abre o dialog vazio
2. **Editar tarefa**: Clique em uma tarefa existente abre o dialog preenchido
3. **Salvar**: Valida que o título não está vazio e adiciona/atualiza a tarefa
4. **Cancelar**: Fecha o dialog sem alterações
5. **Excluir**: O botão X continua funcionando para remover tarefas rapidamente

---

### Visualização da Lista de Tarefas (após mudança)

```text
ANTES (inline editing)
─────────────────────────────────────
☐ [___________Input__________] [Média ▼] [×]

DEPOIS (click to edit)
─────────────────────────────────────
☐ Otimização de Público          ○ Média  [×]
    └── Click abre dialog para edição completa
```

---

### Extensibilidade Futura

O dialog pode ser expandido futuramente para incluir:
- Etiquetas (tags)
- Data de início/vencimento
- Checklist inicial
- Atribuição padrão
- Subtarefas

Mas no momento, focamos nos 3 campos já suportados pelo banco: **título**, **descrição** e **prioridade**.

