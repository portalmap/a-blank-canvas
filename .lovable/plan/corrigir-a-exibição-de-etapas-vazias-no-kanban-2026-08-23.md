# Corrigir a exibição de etapas vazias no Kanban

## Diagnóstico confirmado
- A lista aberta possui 5 status vinculados e ordenados: **Aguardando, Canal Whatsapp, Instagram, LinkedIn e Concluído**.
- O Kanban recebe esses 5 status e já cria uma coluna para cada um, mesmo quando a filtragem deixa a coluna sem tarefas.
- Na tela atual, o quadro ocupa **1664 px** dentro de uma área visível de **1237 px**. Por isso, a última etapa fica fora da área inicial e aparenta estar escondida.

## Implementação
1. Ajustar o layout das colunas para que as etapas cadastradas continuem sendo a fonte do Kanban, sem depender da existência de tarefas.
2. Tornar a largura das colunas responsiva para exibir o conjunto de etapas na área disponível quando houver espaço suficiente, mantendo uma largura mínima legível.
3. Preservar a rolagem horizontal quando houver muitas etapas, deixando seu acesso visual claro e utilizável.
4. Manter cada etapa vazia com título, contador `0`, área de soltar e mensagem “Nenhuma tarefa”.
5. Preservar a ordem definida em `statuses.order_index`, os filtros atuais e o arrastar de tarefas entre etapas.

## Validação
- Conferir a lista atual no Kanban e confirmar que todas as 5 etapas ficam acessíveis, inclusive uma etapa vazia.
- Aplicar um filtro que zere uma etapa e confirmar que ela permanece visível com contador `0`.
- Validar rolagem e arrastar/soltar em desktop e em uma largura menor, sem sobreposição de conteúdo.

## Abrangência
- A correção fica na própria visualização Kanban, portanto vale para **todas as listas atuais e futuras**, sem depender de ajuste por lista.
- As etapas continuam vindo dos status vinculados à lista (com herança de pasta/space/workspace quando a lista não tiver os próprios), então listas novas já nascem com todas as etapas visíveis, inclusive vazias.
