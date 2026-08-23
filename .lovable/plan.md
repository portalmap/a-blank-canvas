# Mostrar etapas (status) vazias

## Problema

Na visão Lista, quando o agrupamento é "Status", os grupos são montados a partir das tarefas existentes e grupos sem tarefas são descartados. Resultado: uma etapa da lista que não tem nenhuma tarefa simplesmente não aparece, então não há para onde arrastar/mover nada.

Exemplo real da lista aberta: ela tem 5 etapas (Aguardando, Canal Whatsapp, Instagram, LinkedIn, Concluído). Com filtros ativos, etapas que ficam sem tarefas desaparecem da tela.

## Solução

1. `src/page-views/ListDetailView.tsx`: passar a lista completa de etapas (`statuses`) para a visão Lista, do mesmo jeito que já é passada para o Kanban.
2. `src/components/views/TaskListView.tsx`:
   - o agrupamento por status passa a partir da lista oficial de etapas (na ordem `order_index`), preenchendo cada uma com suas tarefas;
   - etapas sem tarefas continuam visíveis, com contador 0;
   - grupo extra "Sem Status" só aparece se houver tarefas sem etapa.
3. Kanban: já renderiza todas as etapas da lista, inclusive vazias — apenas confirmar que colunas vazias mantêm altura/área de soltar utilizável.

Os demais agrupamentos (responsável, prioridade, data) continuam ocultando grupos vazios, para não poluir a tela.

## Verificação

Abrir a lista atual em Lista > Agrupar por Status e confirmar que as 5 etapas aparecem, inclusive as que estão sem tarefas após filtros.
