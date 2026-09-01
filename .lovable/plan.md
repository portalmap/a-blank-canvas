# Status na ordem do fluxo (detalhe da tarefa)

## O que acontece hoje

As etapas são buscadas ordenadas apenas por `order_index`. Quando há empate nesse número, a ordem final fica indefinida — e há empates reais no banco: as 4 etapas do escopo do workspace estão todas com `order_index = 0`, e várias listas têm duas etapas com índices repetidos (por exemplo dois "A Fazer" em 0 e 1 no mesmo escopo). Resultado: no seletor de Status dentro da tarefa a sequência aparece embaralhada em vez de seguir o fluxo.

## Correção

1. `src/hooks/useStatuses.ts`: em todas as buscas de etapas (escopo de lista/pasta/space e padrão do workspace), ordenar por `order_index` e, em caso de empate, por `created_at` — assim a ordem passa a ser estável e igual à sequência de criação/definição do modelo.
2. `src/components/tasks/TaskMainContent.tsx` e `src/components/tasks/TaskDetailDrawer.tsx`: garantir que o seletor renderize a lista já ordenada (ordenação explícita por `order_index`, depois `created_at`), sem depender da ordem de chegada.

Como Kanban, agrupamento da Lista e ações em massa consomem as mesmas etapas desse hook, todos ficam com a mesma sequência — sem mexer em nenhuma regra de negócio.

## Observação (fora do escopo desta correção)

Existem listas com etapas de mesmo nome duplicadas ("A Fazer" duas vezes), herdadas da aplicação de modelos. Elas continuarão aparecendo duas vezes, agora em posição estável. Se quiser, posso tratar essa limpeza depois num plano separado.

## Verificação

Abrir uma tarefa, clicar no campo Status e confirmar que as opções aparecem na mesma sequência do Kanban da lista; repetir em uma lista com etapa extra adicionada depois.
