# Plano: Produtividade — considerar apenas a última transferência por usuário/tarefa

## Objetivo
Alterar o cálculo de produtividade para que, quando um mesmo usuário for atribuído, transferir, reatribuir e transferir novamente na mesma tarefa, **apenas a última transferência** dele entre na produtividade. A primeira transferência antes do prazo não deve "proteger" o usuário de uma segunda transferência atrasada.

## Regra de negócio
- Para cada par `(task_id, user_id)`, somente o registro de `task_assignee_history` com o maior `unassigned_at` deve ser considerado como transferência.
- Tarefas concluídas continuam contando normalmente pelo `completed_at`.
- A mudança afeta rankings, estatísticas, relatórios detalhados e detalhes por usuário.

## Escopo técnico
Atualizar as funções RPC do Supabase que lidam com transferências (`transferred_tasks` / `transferred`):
1. `public.get_productivity_details_by_scope`
2. `public.get_productivity_ranking`
3. `public.get_productivity_stats`
4. `public.get_user_productivity_details`

A função `public.get_account_productivity_report` não usa transferências, então não será alterada.

## Implementação
Em cada uma das quatro funções, substituir a consulta sobre `task_assignee_history` por uma subquery que retorne apenas a última transferência por usuário/tarefa:

```sql
SELECT DISTINCT ON (tah.task_id, tah.user_id)
  tah.task_id,
  tah.user_id,
  tah.unassigned_at,
  tah.assigned_at,
  tah.start_date,
  tah.due_date
FROM task_assignee_history tah
WHERE tah.unassigned_at IS NOT NULL
ORDER BY tah.task_id, tah.user_id, tah.unassigned_at DESC
```

Essa subquery será usada no lugar da leitura direta de `task_assignee_history` na CTE de transferências.

## Validação
- Executar um cenário de teste: tarefa com due_date dia 10, transferência dia 5, reatribuição dia 11, segunda transferência dia 12.
- Verificar que o usuário aparece com referência dia 12 (atrasado) e não mais com referência dia 5.
- Conferir ranking, estatísticas e relatórios detalhados para garantir que a contagem de transferências diminuiu e reflete apenas a última.

## Observações
- O frontend (`useProductivityStats`, `useProductivityRanking`, `useProductivityDetailsReport`, `useUserProductivityDetails`) continua chamando as mesmas RPCs; nenhuma mudança de interface é necessária.
- A regra vale para todos os escopos (workspace, space, folder, list, my_tasks, user).
