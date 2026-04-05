

# Produtividade por tarefa com score 0-200% baseado em tempo real

## Resumo

Atualmente o `useProductivityStats` calcula o score de forma simplificada (antecipada=2pts, em dia=1pt, atrasada=0pts). A proposta é usar a fórmula **produtividade = 200 - percentual_entrega**, clamped entre 0 e 200, para cada tarefa individual. Isso dá granularidade real: quem entrega em 10% do prazo ganha 190%, quem entrega em 150% ganha 50%.

## Fórmula

```text
percentual_entrega = (tempo_usado / prazo_total) * 100
produtividade_tarefa = max(0, min(200, 200 - percentual_entrega))

Exemplos:
  0% entrega → 200% produtividade
  50% entrega → 150% produtividade
  100% entrega → 100% produtividade
  150% entrega → 50% produtividade
  200%+ entrega → 0% produtividade
```

## Alterações

### 1. `src/hooks/useProductivityClassification.ts`
- Adicionar função `calculateProductivityScore(startDate, dueDate, referenceDate) → number` (0-200)
- Exportar para uso nos hooks de stats e no indicador visual

### 2. `src/hooks/useProductivityStats.ts`
- Alterar `classifyTask` para usar `start_date` + `due_date` + `completed_at` com a nova fórmula de percentual
- Alterar `calculateScore` para calcular a **média** dos scores individuais (0-200) de cada tarefa
- Buscar `start_date` na query de tasks
- Tarefas sem `start_date` ou `due_date` → score 100 (neutro)

### 3. `src/components/tasks/TaskProductivityIndicator.tsx`
- Exibir no tooltip também o score de produtividade (ex: "150% de produtividade")

### 4. `src/components/settings/ProductivitySettings.tsx`
- Adicionar seção visual explicando a escala 0-200% com exemplos
- Mostrar a fórmula: "Produtividade = 200% - % do prazo utilizado"

### 5. `src/components/dashboards/cards/ProductivityCard.tsx`
- Garantir que o score exibido reflita a escala 0-200% corretamente

## Resultado
- Cada tarefa tem um score individual de produtividade de 0% a 200%
- O score geral é a média dos scores individuais
- 5 arquivos editados

