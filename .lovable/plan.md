

## Plano: Adicionar Opção Trimestral (90 dias) nas Recorrências

### Resumo

Adicionar a opção "Trimestral" em todos os seletores de frequência de recorrência do sistema, incluindo:
- Template de tarefas (Data de Início e Data de Entrega)
- Configuração de ações de automação

O comportamento será similar ao "Mensal", mas com ciclo de 90 dias (3 meses).

---

### O que será alterado

| Local | Mudança |
|-------|---------|
| Interface de Templates | Nova opção "Trimestral" no seletor de frequência |
| Interface de Automações | Nova opção "Trimestral" no seletor de frequência |
| Tipos TypeScript | Adicionar `quarterly` como tipo válido |

---

### Interface do Usuário

O seletor de frequência terá uma nova opção:
- Diariamente
- Semanal
- Quinzenal
- Mensal
- **Trimestral (novo)**

Para "Trimestral", o usuário poderá escolher:
- Primeiro dia do trimestre
- Último dia do trimestre
- Dia específico (ex: dia 15 de cada trimestre)

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/settings/TemplateTaskDialog.tsx` | Adicionar opção "Trimestral" nos 2 seletores + atualizar tipos |
| `src/components/automations/advanced/ActionConfigForm.tsx` | Adicionar opção "Trimestral" no seletor + condicionais |

---

### Seção Técnica

#### 1. Atualizar interface DateRecurrence (TemplateTaskDialog.tsx)

```typescript
export interface DateRecurrence {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'; // Adicionar quarterly
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | string;
  monthlyMode?: 'first_day' | 'last_day' | 'specific_day' | string;
  dayOfMonth?: number;
  // ... resto permanece igual
}
```

#### 2. Atualizar estados e tipos (TemplateTaskDialog.tsx)

```typescript
// Linha ~88
const [startRecurrenceType, setStartRecurrenceType] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'>('weekly');

// Linha ~100
const [dueRecurrenceType, setDueRecurrenceType] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'>('weekly');
```

#### 3. Adicionar opção no Select de Data de Início (TemplateTaskDialog.tsx)

```tsx
// Linha ~434-438
<SelectContent>
  <SelectItem value="daily">Diariamente</SelectItem>
  <SelectItem value="weekly">Semanal</SelectItem>
  <SelectItem value="biweekly">Quinzenal</SelectItem>
  <SelectItem value="monthly">Mensal</SelectItem>
  <SelectItem value="quarterly">Trimestral</SelectItem> {/* NOVO */}
</SelectContent>
```

#### 4. Adicionar configuração para Trimestral (similar ao mensal)

O comportamento de "quarterly" será idêntico ao "monthly" na UI, pois ambos usam `monthlyMode` e `dayOfMonth`. A diferença está apenas no ciclo (3 meses ao invés de 1).

```tsx
// Expandir condição existente para incluir quarterly
{(startRecurrenceType === 'monthly' || startRecurrenceType === 'quarterly') && (
  <>
    <Select value={startMonthlyMode} onValueChange={setStartMonthlyMode}>
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="first_day">Primeiro dia do período</SelectItem>
        <SelectItem value="last_day">Último dia do período</SelectItem>
        <SelectItem value="specific_day">Dia específico</SelectItem>
      </SelectContent>
    </Select>
    {/* ... resto permanece igual */}
  </>
)}
```

#### 5. Repetir para Data de Entrega (linhas ~638-688)

Mesmas alterações:
- Adicionar `<SelectItem value="quarterly">Trimestral</SelectItem>`
- Expandir condição `{(dueRecurrenceType === 'monthly' || dueRecurrenceType === 'quarterly') && (...`

#### 6. Atualizar ActionConfigForm.tsx

```tsx
// Linha ~522-527
<SelectContent>
  <SelectItem value="daily">Diariamente</SelectItem>
  <SelectItem value="weekly">Semanal</SelectItem>
  <SelectItem value="biweekly">Quinzenal</SelectItem>
  <SelectItem value="monthly">Mensal</SelectItem>
  <SelectItem value="quarterly">Trimestral</SelectItem> {/* NOVO */}
</SelectContent>

// Linha ~561 - Expandir condição
{(config.recurrence_type === 'monthly' || config.recurrence_type === 'quarterly') && (
  // ... configuração de dia do mês/período
)}
```

---

### Resultado Esperado

1. Nova opção "Trimestral" aparece em todos os seletores de frequência
2. Ao selecionar "Trimestral", usuário pode escolher:
   - Primeiro dia do trimestre
   - Último dia do trimestre
   - Dia específico do mês (repetido a cada 3 meses)
3. O sistema calculará corretamente o próximo ciclo considerando 90 dias / 3 meses

