# Registrar adição/remoção de etiquetas na atividade da tarefa

Hoje etiquetas são adicionadas/removidas sem gerar nenhum registro em `task_activities`, então nada aparece no histórico da tarefa. Vou passar a registrar esses dois eventos no mesmo formato dos demais (ícone, autor, data e texto descritivo).

## O que muda

1. **Ao adicionar uma etiqueta** — cria atividade `tag.added` com o nome e a cor da etiqueta.
2. **Ao remover uma etiqueta** — cria atividade `tag.removed` com o nome e a cor da etiqueta.
3. **Remoção feita pelo Portal MAP** (quando o post é aprovado ou devolvido e a etiqueta "enviar aprovação" é retirada automaticamente) — também gera o registro `tag.removed`, indicando que veio da integração.
4. **Exibição no histórico** — texto "adicionou a etiqueta X" / "removeu a etiqueta X", com ícone de etiqueta e cor própria, seguindo o padrão visual das outras atividades.

## Detalhes técnicos

- `src/hooks/useTaskTags.ts`: em `useAddTaskTag.onSuccess` e `useRemoveTaskTag.onSuccess`, inserir em `task_activities` (`task_id`, `user_id` do usuário autenticado, `activity_type`, `new_value`/`old_value` = nome da etiqueta, `metadata` = `{ tag_id, tag_name, tag_color }`) e invalidar `['task-activities', taskId]`. Falha no registro não bloqueia a operação da etiqueta (try/catch como nos outros efeitos já existentes).
- `src/hooks/useTaskActivities.ts`: adicionar em `getActivityLabel` os casos `tag.added` e `tag.removed`, preservando o prefixo de automação já usado.
- `src/components/tasks/TaskActivityItem.tsx`: mapear `tag.*` para o ícone `Tag` (lucide) e uma cor dedicada em `getActivityIcon`/`getActivityColor`.
- `supabase/functions/hub-inbox/index.ts`: ao remover a etiqueta em `calendario.post.aprovado`/`reprovado`, inserir a atividade `tag.removed` com `metadata.origem = 'portal-map'`, usando o mesmo autor técnico já utilizado para os comentários da integração. Nenhuma alteração de schema é necessária.
