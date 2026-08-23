# Corrigir definitivamente as etapas do Kanban

## Objetivo
Fazer o Kanban usar os status configurados na lista como fonte de verdade, exibindo cada status como uma etapa mesmo quando não há tarefas nele.

## Implementação
1. **Etapas sempre derivadas dos status**
   - Manter a criação das colunas baseada na lista completa de `statuses`, ordenada por `order_index`.
   - Não condicionar a existência de uma coluna à presença de tarefas.
   - Preservar a coluna de diagnóstico apenas para tarefas ligadas a um status inválido, sem substituir etapas válidas.

2. **Todas as etapas visíveis no espaço disponível**
   - Substituir a largura mínima atual, que empurra a última etapa para fora da tela, por um grid adaptativo.
   - Em telas com espaço suficiente, distribuir todas as etapas uniformemente na largura do Kanban.
   - Quando a quantidade de etapas realmente impossibilitar uma largura utilizável, manter rolagem horizontal clara sem cortar cabeçalhos ou cartões.
   - Manter cada etapa vazia com contador `0` e área de soltura disponível.

3. **Validação**
   - Validar na lista atual os 5 status existentes: Aguardando, Canal Whatsapp, Instagram, LinkedIn e Concluído.
   - Confirmar que todos aparecem simultaneamente como etapas no desktop e que etapas vazias continuam visíveis e aceitam tarefas por arrastar e soltar.
   - Conferir também uma largura menor para garantir que nenhuma etapa seja ocultada ou sobreposta.

## Escopo técnico
- Alteração apenas no componente visual do Kanban (`TaskKanbanView`).
- Sem mudanças no banco, SSO, regras de permissão, tarefas ou configuração dos status.
