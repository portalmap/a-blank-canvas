

# Atualizar Texto do Dialogo de Atribuicao Automatica

## Problema

O dialogo de "Atribuicao Automatica" diz "Todas as tarefas **criadas** nesta Lista..." mas a funcionalidade ja cobre tarefas movidas tambem (implementado anteriormente). O texto precisa refletir isso para o usuario entender que a atribuicao acontece tanto na criacao quanto na movimentacao.

## O que ja funciona

A logica de backend (`applyAutomationsToTask`) ja e chamada tanto na criacao de tarefas quanto na movimentacao (via `useMoveTask` e `executeMoveTask`). Nenhuma alteracao de logica e necessaria.

## Alteracao

### Arquivo: `src/components/automations/QuickAutomationButtons.tsx`

Atualizar o texto da descricao do dialogo (linha 124) de:

> "Todas as tarefas **criadas** nesta Lista terão este usuario como responsavel."

Para:

> "Todas as tarefas **criadas ou movidas** para esta Lista terão este usuario como responsavel."

Tambem atualizar a descricao gerada na criacao da automacao (linha 105) para refletir o comportamento completo.

### Resumo

- 1 arquivo modificado: `src/components/automations/QuickAutomationButtons.tsx`
- Apenas alteracoes de texto, sem mudanca de logica
- A funcionalidade de atribuir ao mover ja esta implementada

