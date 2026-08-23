# Kanban sem tarefas — causa e correção definitiva

## Causa (confirmada no banco)

O Kanban cria uma coluna por status e coloca cada tarefa na coluna cujo `id` é igual ao `status_id` da tarefa. Hoje os dois conjuntos não se encontram:

- As 1.009 tarefas apontam para status **da própria lista** (`statuses.scope_type = 'list'` — 177 status em 86 listas). Nenhuma aponta para status de workspace.
- Mas as listas estão marcadas com `status_source = 'inherit'`, e a resolução de status (`src/hooks/useStatuses.ts`) só lê os status da lista quando `status_source` é `custom` ou `template`. Com `inherit`, ela sobe para pasta e space (que não têm status) e cai no fallback: os **4 status de workspace**.

Resultado: o Kanban desenha 4 colunas de workspace e nenhuma tarefa tem `status_id` correspondente → todas as colunas exibem "Nenhuma tarefa". A visão Lista funciona porque lê o status pela relação da própria tarefa (é o que aparece na coluna STATUS do print: LinkedIn, Canal Whatsapp etc., que são status da lista).

## Solução (é exatamente o que você descreveu)

**Regra definitiva: o Kanban usa sempre os status vinculados à lista, na ordem em que foram criados (`order_index`).**

1. **Prioridade para o status da lista (`src/hooks/useStatuses.ts`)** — em `resolveStatusesForScope`, para escopo `list`, verificar primeiro se existem status com `scope_type='list'` e `scope_id=<lista>`, **independentemente do valor de `status_source`**. Se existirem, são eles as colunas. Só quando a lista não tem status próprios é que segue a herança pasta → space → workspace. Isso vale para o Kanban, para os filtros de status, para o status padrão de novas tarefas (`useDefaultStatusForScope`) e para qualquer tela que já usa esse hook — atuais e futuras.

2. **Normalizar o dado (migration)** — marcar `status_source = 'custom'` nas listas que já possuem status próprios, para que o banco reflita a realidade e as telas de configuração de status mostrem a informação certa. Sem isso o item 1 já funciona, mas a configuração continuaria dizendo "herdado" para uma lista que tem status próprios.

3. **Rede de segurança no Kanban (`src/components/views/TaskKanbanView.tsx`)** — se ainda sobrar alguma tarefa cujo `status_id` não corresponda a nenhuma coluna, exibir uma coluna final "Sem status correspondente" com essas tarefas, em vez de escondê-las. Assim uma divergência futura aparece na tela e nunca mais vira tarefa invisível.

## Validação

- Abrir listas importadas (ex.: "Plan. de Criativos | Accerth", 57 tarefas) no Kanban e conferir colunas na ordem correta e com as tarefas dentro.
- Conferir que a visão Lista, filtros e criação de tarefa continuam com os mesmos status.
- Arrastar um cartão entre colunas e confirmar que o status persiste.

## Escopo técnico

Apenas `src/hooks/useStatuses.ts`, `src/components/views/TaskKanbanView.tsx` e uma migration de normalização de `lists.status_source`. Nada de SSO, hub-inbox, sessão ou outras integrações é tocado.
