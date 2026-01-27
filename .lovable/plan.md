

## Plano: Recorrência Avançada com "Repetir Para Sempre"

### Contexto

A recorrência atual permite escolher Semanal, Quinzenal ou Mensal com dia específico. O usuário precisa de uma opção "Diariamente" com comportamento de **repetição contínua** e sub-opções para controlar como a tarefa é gerenciada ao completar.

---

### Requisitos do Usuário

Baseado na imagem de referência fornecida:

| Campo | Opções |
|-------|--------|
| **Frequência** | Diariamente, Semanal, Quinzenal, Mensal |
| **Gatilho de recorrência** | "Ao alterar o status: Complete" (status de conclusão) |
| **Sub-opções** | Ignorar fins de semana, Criar nova tarefa, Repetir para sempre, Atualizar status para: [status] |

---

### Estrutura de Dados Expandida

```typescript
{
  date_type: 'recurring',
  recurrence_type: 'daily' | 'weekly' | 'biweekly' | 'monthly',
  
  // Para semanal/quinzenal
  day_of_week?: 'monday' | 'tuesday' | ... | 'friday',
  
  // Para mensal
  monthly_mode?: 'first_day' | 'last_day' | 'specific_day',
  day_of_month?: number,
  
  // NOVO: Opções de repetição contínua
  repeat_forever: boolean,
  skip_weekends: boolean,
  on_complete_action: 'create_new_task' | 'update_status',
  reset_status_id?: string, // status para resetar quando "update_status"
  
  // Status que dispara a recorrência (obrigatório)
  trigger_on_status_id?: string, // o status "concluído" que ativa a próxima recorrência
}
```

---

### Interface de Usuário Proposta

```text
┌─────────────────────────────────────────────────────────────┐
│  Recorrência                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frequência                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ● Diariamente                                   ▼   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Ao alterar o status:                                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   Concluído (Done)                              ▼   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [✓] Ignorar fins de semana                          │    │
│  │ [ ] Criar nova tarefa                               │    │
│  │ [✓] Repetir para sempre                             │    │
│  │ [✓] Atualizar status para:                          │    │
│  │     ┌───────────────────────────────────────────┐   │    │
│  │     │   TO DO                               ▼   │   │    │
│  │     └───────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Lógica de Comportamento

1. **Frequência "Diariamente"**: A tarefa tem uma data que se repete todo dia (ou a cada dia útil se "Ignorar fins de semana" estiver marcado)

2. **Ao alterar o status (trigger)**: O usuário seleciona qual status de "conclusão" dispara a recorrência (ex: "Concluído", "Done", etc.)

3. **Sub-opções**:
   - **Ignorar fins de semana**: Pula sábado e domingo no cálculo de próxima data
   - **Criar nova tarefa**: Ao concluir, cria uma cópia da tarefa com a próxima data
   - **Repetir para sempre**: A tarefa continua sendo recriada/atualizada indefinidamente
   - **Atualizar status para**: Ao invés de criar nova, reseta o status para o selecionado (ex: "TO DO")

4. **Mutualmente exclusivo**: "Criar nova tarefa" e "Atualizar status" são opções alternativas - apenas uma pode estar ativa

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/automations/advanced/ActionConfigForm.tsx` | Expandir case `date_config` com frequência "Diariamente" e sub-opções de repetição |
| `src/components/settings/TemplateTaskDialog.tsx` | Adicionar as mesmas opções de recorrência avançada |

---

### Implementação: ActionConfigForm.tsx

#### 1. Adicionar "Diariamente" às frequências

```typescript
<SelectContent>
  <SelectItem value="daily">Diariamente</SelectItem>  {/* NOVO */}
  <SelectItem value="weekly">Semanal</SelectItem>
  <SelectItem value="biweekly">Quinzenal</SelectItem>
  <SelectItem value="monthly">Mensal</SelectItem>
</SelectContent>
```

#### 2. Seletor de status que dispara a recorrência

```typescript
{config.date_type === 'recurring' && (
  <div className="space-y-1.5">
    <Label className="text-xs">
      Ao alterar o status: <span className="text-destructive">*</span>
    </Label>
    <Select
      value={config.trigger_on_status_id || ''}
      onValueChange={(value) => handleFieldChange('trigger_on_status_id', value)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione o status de conclusão..." />
      </SelectTrigger>
      <SelectContent>
        {effectiveStatuses
          .filter(s => s.category === 'done')  // apenas status de conclusão
          .map((status) => (
            <SelectItem key={status.id} value={status.id}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: status.color || '#22c55e' }}
                />
                <span>{status.name}</span>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>
)}
```

#### 3. Checkboxes de sub-opções

```typescript
{config.date_type === 'recurring' && (
  <div className="space-y-2 pt-2">
    {/* Ignorar fins de semana */}
    <div className="flex items-center gap-2">
      <Checkbox
        id="skip_weekends"
        checked={config.skip_weekends || false}
        onCheckedChange={(checked) => handleFieldChange('skip_weekends', checked)}
      />
      <label htmlFor="skip_weekends" className="text-sm">
        Ignorar fins de semana
      </label>
    </div>

    {/* Criar nova tarefa */}
    <div className="flex items-center gap-2">
      <Checkbox
        id="create_new_task"
        checked={config.on_complete_action === 'create_new_task'}
        onCheckedChange={(checked) => {
          if (checked) {
            const { reset_status_id, ...rest } = config;
            onConfigChange({ ...rest, on_complete_action: 'create_new_task' });
          } else {
            const { on_complete_action, ...rest } = config;
            onConfigChange(rest);
          }
        }}
      />
      <label htmlFor="create_new_task" className="text-sm">
        Criar nova tarefa
      </label>
    </div>

    {/* Repetir para sempre */}
    <div className="flex items-center gap-2">
      <Checkbox
        id="repeat_forever"
        checked={config.repeat_forever || false}
        onCheckedChange={(checked) => handleFieldChange('repeat_forever', checked)}
      />
      <label htmlFor="repeat_forever" className="text-sm">
        Repetir para sempre
      </label>
    </div>

    {/* Atualizar status para */}
    <div className="flex items-start gap-2">
      <Checkbox
        id="update_status"
        checked={config.on_complete_action === 'update_status'}
        onCheckedChange={(checked) => {
          if (checked) {
            onConfigChange({ ...config, on_complete_action: 'update_status' });
          } else {
            const { on_complete_action, reset_status_id, ...rest } = config;
            onConfigChange(rest);
          }
        }}
      />
      <div className="flex-1 space-y-1">
        <label htmlFor="update_status" className="text-sm">
          Atualizar status para:
        </label>
        {config.on_complete_action === 'update_status' && (
          <Select
            value={config.reset_status_id || ''}
            onValueChange={(value) => handleFieldChange('reset_status_id', value)}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {effectiveStatuses
                .filter(s => s.category !== 'done')  // excluir status de conclusão
                .map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: status.color || '#94a3b8' }}
                      />
                      <span>{status.name}</span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  </div>
)}
```

---

### Implementação: TemplateTaskDialog.tsx

Aplicar a mesma estrutura de UI expandida para os campos de Data de Início e Data de Entrega:

#### 1. Novos estados

```typescript
// Estados adicionais para recorrência avançada
const [startRepeatForever, setStartRepeatForever] = useState(false);
const [startSkipWeekends, setStartSkipWeekends] = useState(false);
const [startOnCompleteAction, setStartOnCompleteAction] = useState<'create_new_task' | 'update_status' | ''>('');
const [startResetStatusId, setStartResetStatusId] = useState('');
const [startTriggerStatusId, setStartTriggerStatusId] = useState('');

// Mesmos para due date
const [dueRepeatForever, setDueRepeatForever] = useState(false);
// ... etc
```

#### 2. Expandir a interface DateRecurrence

```typescript
interface DateRecurrence {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  monthlyMode?: 'first_day' | 'last_day' | 'specific_day';
  dayOfMonth?: number;
  // NOVO
  repeatForever?: boolean;
  skipWeekends?: boolean;
  onCompleteAction?: 'create_new_task' | 'update_status';
  resetStatusId?: string;
  triggerOnStatusId?: string;
}
```

---

### Resultado Final

1. **Frequência "Diariamente"**: Nova opção para tarefas que se repetem todo dia
2. **Status de gatilho**: Usuário define qual status de conclusão ativa a recorrência
3. **Ignorar fins de semana**: Pula sábado/domingo no cálculo de datas
4. **Criar nova tarefa**: Ao concluir, duplica a tarefa com nova data
5. **Repetir para sempre**: Continua indefinidamente
6. **Atualizar status**: Reseta para um status específico ao invés de criar nova tarefa

Essa estrutura permite controle granular sobre como tarefas recorrentes se comportam, mantendo consistência com a imagem de referência fornecida.

