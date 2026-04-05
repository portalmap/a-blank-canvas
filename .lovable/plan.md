

# Corrigir Ranking de Produtividade para usar fórmula 0-200%

## Problema

O hook `useProductivityRanking` ainda usa o sistema antigo de pontuação (antecipada=2pts, em dia=1pt, atrasada=0pts) e classifica por dias fixos (`>= 7 dias = antecipada`). O `useProductivityStats` já foi atualizado para a fórmula percentual, mas o ranking não.

Além disso, a query do ranking não busca `start_date`, impossibilitando o cálculo de percentual de entrega.

## Alterações

### `src/hooks/useProductivityRanking.ts`
- Importar `calculateProductivityScore` e `calculateDeliveryPercentage` de `useProductivityClassification`
- Adicionar `start_date` na query de tasks (`.select('id, completed_at, due_date, start_date')`)
- Substituir `classifyTask` para usar a mesma lógica percentual: `<= 50%` = antecipada, `50-100%` = em dia, `> 100%` = atrasada
- Substituir `classifyTransferred` pela mesma lógica percentual (usando `assigned_at` como início e `unassigned_at` como referência)
- Substituir `calculateScore` para calcular a **média dos scores individuais** (0-200) usando `calculateProductivityScore`
- Tarefas sem `start_date` ou `due_date` → score 100 (neutro)
- Buscar `start_date` e `assigned_at` na query de `task_assignee_history` para transferências

## Resultado
- O ranking passa a usar a mesma fórmula 0-200% que o card de produtividade
- As classificações (antecipada/em dia/atrasada) ficam consistentes em todo o sistema
- 1 arquivo editado

