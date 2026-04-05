

# Classificação de Produtividade + Indicador Visual nas Tarefas

## Problema atual

As tabelas de produtividade existem (`productivity_settings`, `productivity_validators`, `task_productivity_validations`, `task_assignee_history` com campo `classification`), mas nada no frontend calcula nem exibe a classificação. Quando uma tarefa é concluída ou transferida, nenhum registro de produtividade aparece.

## O que será feito

### 1. Indicador visual de produtividade ("lâmpada") no Status

Ao lado do badge de status da tarefa (no `TaskMainContent` e `TaskDetailDrawer`), exibir um pequeno círculo colorido que mostra a situação atual em tempo real:

- 🟢 **Verde** = dentro de até 50% do prazo (antecipada)
- 🔵 **Azul** = entre 50,01% e 100% do prazo (em dia)
- 🔴 **Vermelha** = acima de 100% do prazo (atrasada)
- Só aparece se a tarefa tiver `start_date` e `due_date`
- Enquanto a tarefa está em andamento, a lâmpada muda dinamicamente conforme o tempo passa
- Quando concluída, congela na classificação do momento da conclusão

### 2. Registro automático no histórico de atividades

Quando o status muda para "done" (concluído), registrar automaticamente uma atividade `productivity.classified` com:
- A classificação calculada (Antecipada / Em dia / Atrasada)
- Cores correspondentes no histórico
- Atualizar o campo `classification` na `task_assignee_history`

### 3. Lógica de cálculo

```text
prazo_total = due_date - start_date (em milissegundos)
tempo_usado = momento_atual_ou_conclusão - start_date
percentual = (tempo_usado / prazo_total) * 100

Se percentual <= 50%  → Antecipada (verde)
Se percentual <= 100% → Em dia (azul)
Se percentual > 100%  → Atrasada (vermelha)
```

### 4. Espaço para validação futura

No histórico, o evento `productivity.classified` aparecerá com a lâmpada e o texto. Numa próxima etapa, o botão "Validar" será adicionado ao lado desse registro para os validadores confirmarem ou alterarem.

## Alterações técnicas

### Criar: `src/components/tasks/TaskProductivityIndicator.tsx`
- Componente que recebe `start_date`, `due_date`, `completed_at`
- Calcula o percentual e renderiza o círculo colorido com tooltip explicativo
- Busca thresholds do `productivity_settings` do workspace (ou usa defaults 50/100)

### Criar: `src/hooks/useProductivityClassification.ts`
- Função pura `calculateClassification(startDate, dueDate, completedAt, earlyThreshold, onTimeThreshold)` → `'early' | 'on_time' | 'late'`
- Hook `useTaskProductivityIndicator(task)` que combina settings + cálculo

### Editar: `src/components/tasks/TaskMainContent.tsx`
- Após o status badge, renderizar `<TaskProductivityIndicator>` se houver datas
- No `handleStatusChange`, quando o novo status for "done", registrar atividade `productivity.classified` e atualizar `task_assignee_history.classification`

### Editar: `src/components/tasks/TaskDetailDrawer.tsx`
- Mesma adição do indicador ao lado do status

### Editar: `src/hooks/useTaskActivities.ts`
- Adicionar case `productivity.classified` no `getActivityLabel`:
  - "Tarefa classificada como Antecipada/Em dia/Atrasada"
- Adicionar case `productivity.validated` para uso futuro

### Editar: `src/components/tasks/TaskActivityItem.tsx`
- Adicionar ícone e cor para `productivity.classified` (usar ícone de círculo com a cor correspondente)
- Renderizar a lâmpada colorida inline no texto da atividade

## Arquivos
- **Criados**: `TaskProductivityIndicator.tsx`, `useProductivityClassification.ts`
- **Editados**: `TaskMainContent.tsx`, `TaskDetailDrawer.tsx`, `useTaskActivities.ts`, `TaskActivityItem.tsx`

