

## Plano: Adicionar Opção de Recorrência nas Datas

### Contexto

Atualmente, a configuração de datas (início e vencimento) nas automações e tarefas de template só permite modos básicos como "primeiro/último dia do mês" ou "dias após o gatilho". O usuário precisa de uma opção de **recorrência** com frequências e dias específicos da semana/mês.

---

### Requisitos Solicitados

| Campo | Opções |
|-------|--------|
| **Frequência** | Semanal, Quinzenal, Mensal |
| **Dias da Semana** | Segunda, Terça, Quarta, Quinta, Sexta |
| **Dias do Mês** | Primeiro dia do mês, Último dia do mês, Data específica |

---

### Estrutura de Dados Proposta

A configuração ficará armazenada no `action_config` como um objeto JSONB:

```typescript
// Para recorrência semanal/quinzenal
{
  date_type: 'recurring',
  recurrence_type: 'weekly' | 'biweekly' | 'monthly',
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday',
  // OU para mensal:
  monthly_mode: 'first_day' | 'last_day' | 'specific_day',
  day_of_month?: 15, // se monthly_mode = 'specific_day'
}
```

---

### Interface de Usuário Proposta

```text
┌─────────────────────────────────────────────────────────┐
│  Configurar data                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tipo de data                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ○ Primeiro dia do mês                             │  │
│  │ ○ Último dia do mês                               │  │
│  │ ○ Dias após o gatilho                             │  │
│  │ ○ Dia específico do mês                           │  │
│  │ ● Recorrente                               ← NOVO │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Se "Recorrente" selecionado:                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Frequência                                       │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ ○ Semanal                                   │  │  │
│  │  │ ○ Quinzenal                                 │  │  │
│  │  │ ○ Mensal                                    │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Se Semanal/Quinzenal:                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Dia da semana                                    │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ [Seg] [Ter] [Qua] [Qui] [Sex]               │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Se Mensal:                                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Dia do mês                                       │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │ ○ Primeiro dia do mês                       │  │  │
│  │  │ ○ Último dia do mês                         │  │  │
│  │  │ ○ Dia específico: [__15__]                  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/automations/advanced/ActionConfigForm.tsx` | Expandir o `case 'date_config'` para incluir opção de recorrência |
| `src/components/settings/TemplateTaskDialog.tsx` | Adicionar opção de recorrência nos campos de data de início/entrega |

---

### Implementação: ActionConfigForm.tsx

#### 1. Expandir as opções de `date_type`

```typescript
<SelectContent>
  <SelectItem value="first_day_of_month">Primeiro dia do mês</SelectItem>
  <SelectItem value="last_day_of_month">Último dia do mês</SelectItem>
  <SelectItem value="days_after_trigger">Dias após o gatilho</SelectItem>
  <SelectItem value="specific_day">Dia específico do mês</SelectItem>
  <SelectItem value="recurring">Recorrente</SelectItem>  {/* NOVO */}
</SelectContent>
```

#### 2. Campos Condicionais para Recorrência

```typescript
{config.date_type === 'recurring' && (
  <>
    {/* Seletor de frequência */}
    <div className="space-y-2">
      <Label>Frequência</Label>
      <Select
        value={config.recurrence_type || ''}
        onValueChange={(value) => {
          const { day_of_week, monthly_mode, ...rest } = config;
          onConfigChange({ ...rest, recurrence_type: value });
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a frequência..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="weekly">Semanal</SelectItem>
          <SelectItem value="biweekly">Quinzenal</SelectItem>
          <SelectItem value="monthly">Mensal</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Seletor de dia da semana (para semanal/quinzenal) */}
    {(config.recurrence_type === 'weekly' || config.recurrence_type === 'biweekly') && (
      <div className="space-y-2">
        <Label>Dia da semana</Label>
        <div className="flex gap-1">
          {[
            { value: 'monday', label: 'Seg' },
            { value: 'tuesday', label: 'Ter' },
            { value: 'wednesday', label: 'Qua' },
            { value: 'thursday', label: 'Qui' },
            { value: 'friday', label: 'Sex' },
          ].map((day) => (
            <Button
              key={day.value}
              type="button"
              variant={config.day_of_week === day.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFieldChange('day_of_week', day.value)}
            >
              {day.label}
            </Button>
          ))}
        </div>
      </div>
    )}

    {/* Seletor de dia do mês (para mensal) */}
    {config.recurrence_type === 'monthly' && (
      <div className="space-y-2">
        <Label>Dia do mês</Label>
        <Select
          value={config.monthly_mode || ''}
          onValueChange={(value) => handleFieldChange('monthly_mode', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_day">Primeiro dia do mês</SelectItem>
            <SelectItem value="last_day">Último dia do mês</SelectItem>
            <SelectItem value="specific_day">Dia específico</SelectItem>
          </SelectContent>
        </Select>
        
        {config.monthly_mode === 'specific_day' && (
          <Input
            type="number"
            min={1}
            max={31}
            value={config.day_of_month || ''}
            onChange={(e) => handleFieldChange('day_of_month', parseInt(e.target.value))}
            placeholder="Ex: 15"
          />
        )}
      </div>
    )}
  </>
)}
```

---

### Implementação: TemplateTaskDialog.tsx

Substituir os simples campos numéricos de offset por um seletor mais avançado que permite escolher entre:
- **Offset simples** (dias após criação) - comportamento atual
- **Recorrente** (com frequência e dia)

```typescript
<div className="space-y-2">
  <label className="text-sm font-medium flex items-center gap-2">
    <Calendar className="h-4 w-4" /> Data de Início
  </label>
  
  <Select
    value={startDateMode}
    onValueChange={setStartDateMode}
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecione o modo..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="offset">Dias após criação</SelectItem>
      <SelectItem value="recurring">Recorrente</SelectItem>
    </SelectContent>
  </Select>

  {startDateMode === 'offset' && (
    <Input
      type="number"
      min={0}
      value={startDateOffset}
      onChange={(e) => setStartDateOffset(e.target.value)}
      placeholder="Ex: 0"
    />
  )}

  {startDateMode === 'recurring' && (
    <div className="space-y-2 p-3 bg-muted/30 rounded-md">
      {/* Frequência */}
      <Select
        value={startRecurrenceType}
        onValueChange={setStartRecurrenceType}
      >
        <SelectTrigger>
          <SelectValue placeholder="Frequência..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="weekly">Semanal</SelectItem>
          <SelectItem value="biweekly">Quinzenal</SelectItem>
          <SelectItem value="monthly">Mensal</SelectItem>
        </SelectContent>
      </Select>

      {/* Seletor de dia */}
      {(startRecurrenceType === 'weekly' || startRecurrenceType === 'biweekly') && (
        <div className="flex gap-1 flex-wrap">
          {WEEKDAYS.map((day) => (
            <Button
              key={day.value}
              type="button"
              size="sm"
              variant={startDayOfWeek === day.value ? 'default' : 'outline'}
              onClick={() => setStartDayOfWeek(day.value)}
            >
              {day.label}
            </Button>
          ))}
        </div>
      )}

      {startRecurrenceType === 'monthly' && (
        <Select
          value={startMonthlyMode}
          onValueChange={setStartMonthlyMode}
        >
          <SelectContent>
            <SelectItem value="first_day">Primeiro dia do mês</SelectItem>
            <SelectItem value="last_day">Último dia do mês</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )}
</div>
```

---

### Constantes de Dias

```typescript
const WEEKDAYS = [
  { value: 'monday', label: 'Seg' },
  { value: 'tuesday', label: 'Ter' },
  { value: 'wednesday', label: 'Qua' },
  { value: 'thursday', label: 'Qui' },
  { value: 'friday', label: 'Sex' },
] as const;
```

---

### Estrutura de Dados no TaskData (TemplateTaskDialog)

Expandir a interface para suportar recorrência:

```typescript
export interface TaskData {
  title: string;
  description: string;
  priority: string;
  // Datas com offset (modo atual)
  startDateOffset: number | null;
  dueDateOffset: number | null;
  // Novo: Recorrência
  startDateRecurrence?: {
    type: 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
    monthlyMode?: 'first_day' | 'last_day';
  } | null;
  dueDateRecurrence?: {
    type: 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
    monthlyMode?: 'first_day' | 'last_day';
  } | null;
  // ... demais campos
}
```

---

### Resultado Final

1. **Automações**: Ações de `set_due_date` e `set_start_date` terão a opção "Recorrente" com configuração de frequência e dia
2. **Templates de Tarefa**: Os campos de data poderão usar offset simples OU configuração de recorrência
3. **Flexibilidade**: Permite escolher entre dias da semana (para semanal/quinzenal) ou dias específicos do mês (para mensal)
4. **Armazenamento**: Toda a configuração fica no JSONB do `action_config` (automações) ou nos campos expandidos do template

