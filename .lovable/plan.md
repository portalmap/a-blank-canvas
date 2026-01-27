# Plano: Recorrência Avançada com "Repetir Para Sempre"

## Status: ✅ Implementado

### Contexto

Implementada a recorrência avançada nas configurações de data das automações e tarefas de template, permitindo tarefas que se repetem diariamente com controle sobre o comportamento ao completar.

---

### Funcionalidades Implementadas

| Campo | Opções |
|-------|--------|
| **Frequência** | Diariamente, Semanal, Quinzenal, Mensal |
| **Gatilho de recorrência** | "Ao alterar o status: [status de conclusão]" |
| **Sub-opções** | Ignorar fins de semana, Criar nova tarefa, Repetir para sempre, Atualizar status para: [status] |

---

### Estrutura de Dados

```typescript
interface DateRecurrence {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  monthlyMode?: 'first_day' | 'last_day' | 'specific_day';
  dayOfMonth?: number;
  // Opções de repetição contínua
  repeatForever?: boolean;
  skipWeekends?: boolean;
  onCompleteAction?: 'create_new_task' | 'update_status';
  resetStatusId?: string;
  triggerOnStatusId?: string;
}
```

---

### Arquivos Modificados

| Arquivo | Alterações |
|---------|------------|
| `src/components/automations/advanced/ActionConfigForm.tsx` | Adicionado import do Checkbox, frequência "Diariamente", seletor de status gatilho, checkboxes de sub-opções (ignorar fins de semana, repetir para sempre, criar nova tarefa, atualizar status) |
| `src/components/settings/TemplateTaskDialog.tsx` | Interface DateRecurrence expandida, novos estados para recorrência avançada (repeatForever, skipWeekends, onCompleteAction, resetStatusId, triggerStatusId), UI completa com todas as sub-opções |

---

### Comportamento

1. **Frequência "Diariamente"**: Tarefa se repete todo dia (ou a cada dia útil se "Ignorar fins de semana" estiver marcado)

2. **Ao alterar o status (trigger)**: Usuário seleciona qual status de "conclusão" dispara a recorrência

3. **Sub-opções**:
   - **Ignorar fins de semana**: Pula sábado e domingo no cálculo de próxima data
   - **Repetir para sempre**: A tarefa continua sendo recriada/atualizada indefinidamente
   - **Criar nova tarefa**: Ao concluir, cria uma cópia da tarefa com a próxima data
   - **Atualizar status para**: Reseta o status para o selecionado ao invés de criar nova tarefa

4. **Mutualmente exclusivo**: "Criar nova tarefa" e "Atualizar status" são opções alternativas
