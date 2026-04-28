## Adicionar recorrência por "ordinal do dia da semana" (ex.: toda 1ª segunda-feira do mês)

Hoje a recorrência mensal/trimestral só permite **Primeiro dia**, **Último dia** ou **Dia específico** (número 1–31). Vamos adicionar um novo modo **"Dia da semana"** que combina uma **ordem** (1ª, 2ª, 3ª, 4ª ou Última) com um **dia da semana** (segunda a domingo). Funciona para frequência **Mensal** e **Trimestral**.

### Onde aparece (UI)

**1. Tarefas — `TaskRecurrenceConfig.tsx`**
- No campo **"Dia do período"**, adicionar uma 4ª opção: **"Dia da semana específico"**.
- Quando selecionada, exibir 2 selects lado a lado:
  - **Ordem**: Primeira / Segunda / Terceira / Quarta / Última
  - **Dia da semana**: Segunda / Terça / ... / Domingo
- Ex.: "Primeira" + "Segunda-feira" → toda 1ª segunda do mês.

**2. Automações — `ActionConfigForm.tsx`**
- Mesma opção adicionada ao bloco mensal/trimestral da ação de recorrência, mantendo paridade com a UI da tarefa.

### Mudanças de dados (sem migração SQL)

A coluna `recurrence_config` já é `JSONB` livre — basta estender o shape:

```ts
interface RecurrenceConfig {
  // ... campos atuais
  monthly_mode?: 'first_day' | 'last_day' | 'specific_day' | 'weekday_ordinal'; // NOVO valor
  weekday_ordinal?: 1 | 2 | 3 | 4 | -1; // -1 = última
  weekday?: 'monday' | 'tuesday' | ... | 'sunday';
}
```

Configs antigas continuam funcionando (compatível).

### Lógica de cálculo — `useStatusChangeAutomations.ts` (`calculateNextDates`)

Adicionar tratamento do modo `weekday_ordinal` nos cases `monthly` e `quarterly`:

1. Avançar para o mês alvo (atual + 1 para mensal, +3 para trimestral).
2. Se `ordinal >= 1`: começar no dia 1 do mês, achar o primeiro `weekday`, somar `(ordinal - 1) * 7` dias. Se cair fora do mês, manter no último válido.
3. Se `ordinal === -1` (última): começar no último dia do mês e voltar até achar o `weekday`.
4. Aplicar `skip_weekends` apenas quando o weekday escolhido for útil (não desloca sábado/domingo escolhido propositalmente — vamos ignorar `skip_weekends` neste modo para evitar conflito).

### Arquivos a editar

- `src/components/tasks/TaskRecurrenceConfig.tsx` — novo modo + campos de ordem/dia da semana.
- `src/components/automations/advanced/ActionConfigForm.tsx` — mesma opção no editor de automações.
- `src/hooks/useStatusChangeAutomations.ts` — função `calculateNextDates` com lógica do ordinal.

### Memória

Atualizar `mem://features/automations/advanced-recurrence-logic` para registrar o novo modo `weekday_ordinal`.

### Resultado esperado

Usuário poderá configurar "toda primeira segunda-feira do mês", "toda terceira quinta-feira do mês", "toda última sexta do mês" etc., tanto em tarefas recorrentes quanto em ações de automação de recorrência, sem quebrar nenhuma configuração existente.