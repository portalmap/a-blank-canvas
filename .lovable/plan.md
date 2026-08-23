# Kanban sem tarefas — diagnóstico e correção

## O que está acontecendo (confirmado no banco)

O Kanban monta uma coluna por status e coloca cada tarefa na coluna cujo `id` é igual ao `status_id` da tarefa. Hoje esses dois conjuntos não se encontram:

- Todas as 1.009 tarefas apontam para status **próprios da lista** (`statuses.scope_type = 'list'`, 177 status em 86 listas). Nenhuma tarefa aponta para status de workspace.
- Mas as listas importadas estão marcadas como `status_source = 'inherit'`. A resolução de status (`src/hooks/useStatuses.ts`) só lê os status da própria lista quando `status_source` é `custom` ou `template`. Com `inherit`, ela procura na pasta, depois no space (nenhum dos dois tem status cadastrado) e cai no fallback: os **4 status de workspace**.

Resultado: o Kanban desenha 4 colunas de workspace, e nenhuma tarefa tem `status_id` correspondente → todas as colunas mostram "Nenhuma tarefa". A visão Lista continua funcionando porque ela lê o status pela relação da própria tarefa, não pelo conjunto de colunas.

Isso não é bug de drag-and-drop, de RLS nem de carregamento de tarefas — é desencontro entre o status da tarefa e as colunas resolvidas.

## Correção proposta

1. **Resolução de status (`src/hooks/useStatuses.ts`)** — em `resolveStatusesForScope`, para escopo `list`, verificar primeiro se existem status vinculados àquela lista (`scope_type='list'`, `scope_id=<lista>`) independentemente de `status_source`. Se existirem, usá-los; só então seguir a herança pasta → space → workspace. Mesma regra aplicada ao `useDefaultStatusForScope`, que usa a mesma função.

2. **Normalizar o dado importado (migration)** — marcar `status_source = 'custom'` nas listas que já possuem status próprios, para que o estado no banco reflita a realidade e as telas de configuração de status mostrem a informação certa.

3. **Rede de segurança no Kanban (`src/components/views/TaskKanbanView.tsx`)** — quando existirem tarefas cujo `status_id` não corresponde a nenhuma coluna, exibir uma coluna final "Sem status correspondente" com essas tarefas, em vez de simplesmente ocultá-las. Assim uma futura divergência aparece na tela ao invés de virar tarefa invisível.

## Validação

- Abrir listas importadas (ex.: "Plan. de Criativos | Accerth", 57 tarefas) na visão Kanban e conferir colunas preenchidas.
- Conferir que a visão Lista e os filtros continuam iguais.
- Arrastar um cartão entre colunas e confirmar que o status persiste.

## Escopo técnico

Somente `src/hooks/useStatuses.ts`, `src/components/views/TaskKanbanView.tsx` e uma migration de normalização de `lists.status_source`. Nada de SSO, hub-inbox, sessão ou outras integrações.
