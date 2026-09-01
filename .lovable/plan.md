# Status na ordem do fluxo (detalhe da tarefa)

## Sobre as "etapas repetidas"

Verifiquei no banco: não existem índices repetidos dentro de um mesmo escopo. O que existe é **nome repetido**: o modelo de etapas "Tráfego Pago" foi cadastrado com dois itens chamados "A Fazer" (posições 0 e 1, categorias "não iniciado" e "ativo"). Toda lista que usa esse modelo herda os dois. Ou seja, é conteúdo do modelo, não erro de sincronização — para resolver basta renomear ou remover um dos itens na configuração do modelo.

## O que causa a ordem errada no seletor de Status

As etapas são buscadas ordenadas só por `order_index`, sem critério de desempate. Nas etapas padrão do workspace as quatro linhas estão todas com `order_index = 0`, então a ordem devolvida fica indefinida e o seletor dentro da tarefa mostra a sequência embaralhada.

## Correção

1. `src/hooks/useStatuses.ts`: em todas as buscas de etapas (lista, pasta, space e padrão do workspace), ordenar por `order_index` e, em empate, por `created_at` — ordem estável e igual à sequência de definição do modelo.
2. `src/components/tasks/TaskMainContent.tsx` e `src/components/tasks/TaskDetailDrawer.tsx`: renderizar o seletor a partir da lista explicitamente ordenada (`order_index`, depois `created_at`), sem depender da ordem de chegada.

Kanban, agrupamento da Lista e ações em massa usam as mesmas etapas desse hook, então todos ficam com a mesma sequência. Nenhuma regra de negócio muda.

## Verificação

Abrir uma tarefa, clicar no campo Status e confirmar que as opções aparecem na mesma sequência do Kanban da lista; repetir em uma lista com etapa adicionada depois ("Aguardando") e numa tarefa que usa as etapas padrão do workspace.
