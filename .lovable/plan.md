# Modelo de status "sincronizado" precisa realmente propagar

## O que está acontecendo (verificado)

- A função de sincronização no banco (`sync_template_statuses_for_list`) só é chamada quando a lista **ainda não tem nenhuma etapa**. Em `src/hooks/useStatuses.ts`, se a lista já tem etapas vindas do modelo, elas são tratadas como "fonte de verdade" e nada é ressincronizado. Ou seja: editar o modelo nas configurações nunca chega às listas/tarefas já criadas.
- Ao salvar um modelo (`useUpdateStatusTemplate`), os itens são **apagados e reinseridos**. Isso quebra o vínculo `template_item_id` das etapas já sincronizadas, então nem uma sincronização futura conseguiria casar item ↔ etapa.
- A função do banco sincroniza apagando as etapas e reinserindo — o que arriscaria as tarefas que apontam para elas.
- Depois de salvar o modelo, só os caches `status-templates` são invalidados; `statuses`, `statuses-for-scope`, `default-status*` e `tasks` continuam com os dados antigos, então a tela da tarefa segue mostrando a versão anterior mesmo após recarregar dados.

## Correções

### 1. Salvar o modelo sem destruir os itens
`src/hooks/useStatusTemplates.ts` (`useUpdateStatusTemplate`): atualizar os itens existentes pelo `id` (nome, cor, ordem, categoria, padrão), inserir os novos e excluir apenas os que o usuário realmente removeu — preservando `status_template_items.id` e, com isso, o vínculo com as etapas já sincronizadas.

### 2. Nova função de ressincronização no banco (não destrutiva)
Criar `public.resync_template_statuses(p_template_id uuid, p_reassign jsonb)` que, para **todo** escopo (lista, pasta, space) com `status_source = 'template'` e `status_template_id = p_template_id`:
- atualiza as etapas existentes casadas por `template_item_id` (ou, quando faltar o vínculo, por nome normalizado, gravando o `template_item_id`): **nome, cor, posição (ordem), categoria e etapa padrão** — renomear e reordenar passa a funcionar livremente, sem tocar nas tarefas;
- insere as etapas novas do modelo;
- para cada etapa do modelo que foi removida: move as tarefas para a etapa de destino indicada em `p_reassign` (mapa "item removido → item de destino", que pode ser uma etapa existente ou uma recém-criada) e só então exclui;
- se uma etapa removida ainda tiver tarefas e não houver destino indicado, a função **falha com mensagem clara** em vez de excluir;
- nunca apaga etapas criadas manualmente fora do modelo (`template_item_id IS NULL`) — elas continuam ao final da sequência.

Assim os IDs das etapas se mantêm e nenhuma tarefa perde o status.

### 3. Fluxo de perguntas ao excluir uma etapa do modelo
No editor do modelo (`src/components/settings/StatusTemplateEditor.tsx`), ao salvar:
1. Detectar itens removidos e consultar quantas tarefas usam as etapas correspondentes em todos os escopos que usam o modelo (nova função de leitura, ex.: `count_tasks_for_template_items`).
2. Se houver tarefas, abrir um diálogo explicando que não é possível excluir com tarefas nas etapas, listando etapa removida + quantidade de tarefas, e pedindo para cada uma o destino: qualquer etapa que continua no modelo, inclusive as novas criadas nessa mesma edição.
3. Confirmado o destino, salvar e ressincronizar com o mapa de transferência: as tarefas vão para a etapa escolhida e depois a etapa removida é excluída.
4. Se as etapas removidas não têm tarefa nenhuma, salva direto, sem perguntas.

### 4. Chamar a ressincronização e limpar os caches
Depois de salvar o modelo, chamar `resync_template_statuses` e invalidar `status-templates`, `status-template`, `statuses`, `statuses-for-scope`, `default-status`, `default-status-for-scope`, `tasks` e `task`. A tela da tarefa passa a refletir a alteração imediatamente.

### 4. Ordem estável das etapas
`src/hooks/useStatuses.ts`: ordenar por `order_index` e, em empate, por `created_at`, em todas as buscas de etapas. Hoje as etapas padrão do workspace estão todas com `order_index = 0`, o que deixa o seletor de Status da tarefa em ordem indefinida. Com isso, o seletor da tarefa passa a seguir a mesma sequência do Kanban / do modelo.

## Observação já verificada

O modelo "Tráfego Pago" tem dois itens chamados "A Fazer" (posições 0 e 1). É conteúdo do próprio modelo, não erro de sincronização — dá para renomear/remover um deles na tela de configuração depois desta correção.

## Verificação

Renomear/reordenar uma etapa em um modelo sincronizado, salvar e abrir uma tarefa de uma lista que usa esse modelo: o seletor de Status deve mostrar o novo nome e a nova ordem, com a tarefa mantendo a etapa em que estava.
