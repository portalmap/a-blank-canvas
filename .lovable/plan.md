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
Criar `public.resync_template_statuses(p_template_id uuid)` que, para **todo** escopo (lista, pasta, space) com `status_source = 'template'` e `status_template_id = p_template_id`:
- atualiza as etapas existentes casadas por `template_item_id` (ou, quando faltar o vínculo, por nome normalizado, gravando o `template_item_id`): nome, cor, ordem, categoria e etapa padrão;
- insere as etapas novas do modelo;
- para etapas do modelo que foram removidas: move as tarefas que as usam para a etapa padrão do modelo e só então exclui;
- nunca apaga etapas criadas manualmente fora do modelo (`template_item_id IS NULL`) — elas continuam ao final da sequência.

Assim os IDs das etapas se mantêm e nenhuma tarefa perde o status.

### 3. Chamar a ressincronização e limpar os caches
Depois de salvar o modelo, chamar `resync_template_statuses` e invalidar `status-templates`, `status-template`, `statuses`, `statuses-for-scope`, `default-status`, `default-status-for-scope`, `tasks` e `task`. A tela da tarefa passa a refletir a alteração imediatamente.

### 4. Ordem estável das etapas
`src/hooks/useStatuses.ts`: ordenar por `order_index` e, em empate, por `created_at`, em todas as buscas de etapas. Hoje as etapas padrão do workspace estão todas com `order_index = 0`, o que deixa o seletor de Status da tarefa em ordem indefinida. Com isso, o seletor da tarefa passa a seguir a mesma sequência do Kanban / do modelo.

## Observação já verificada

O modelo "Tráfego Pago" tem dois itens chamados "A Fazer" (posições 0 e 1). É conteúdo do próprio modelo, não erro de sincronização — dá para renomear/remover um deles na tela de configuração depois desta correção.

## Verificação

Renomear/reordenar uma etapa em um modelo sincronizado, salvar e abrir uma tarefa de uma lista que usa esse modelo: o seletor de Status deve mostrar o novo nome e a nova ordem, com a tarefa mantendo a etapa em que estava.
