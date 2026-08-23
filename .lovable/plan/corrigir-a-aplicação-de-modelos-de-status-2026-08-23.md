# Corrigir a aplicação de Modelos de Status

## O que está acontecendo hoje (confirmado no banco)

Você aplicou o modelo "Plan. de Criativos" em 5 listas. No banco elas ficaram
marcadas como `status_source = 'template'` e ligadas ao modelo, mas **nenhuma
etapa do modelo foi criada** (0 status vindos do modelo em todas elas). Elas
continuam com as etapas antigas (ex.: Accerth com Aguardando, Canal Whatsapp,
Instagram, LinkedIn, Concluído). Ou seja: a aplicação "gravou o vínculo" e não
mudou nada visível.

Três causas somadas:

1. **A resolução de status ignora o modelo.** A regra atual dá prioridade
   absoluta às etapas próprias da lista; só busca/sincroniza o modelo quando a
   lista está *sem nenhuma* etapa. Como as 85 listas importadas já têm etapas
   próprias, o modelo nunca entra.
2. **O modo "Sincronizado" nunca gera as etapas.** Ele apenas atualiza os campos
   de vínculo na lista/pasta/space; a criação das etapas depende daquela
   sincronização que não roda (item 1).
3. **O modo "Cópia Independente" duplica.** Ele insere as etapas do modelo sem
   remover as antigas, então a lista passaria a ter etapas repetidas.

Bônus (por que a tela parece "não responder"): ao final da aplicação só são
invalidadas as consultas `statuses`, e não `statuses-for-scope` — que é a que
alimenta Kanban/Lista. Mesmo quando algo muda, a tela não atualiza sem recarregar.

## O que será feito

### 1. Aplicação passa a realmente trocar as etapas
Em `useStatusTemplates.ts` (`useApplyStatusTemplate`), para cada destino
(space / pasta / lista) e nos dois modos:

- Criar as etapas do modelo no escopo, na ordem e com cor/categoria do modelo
  (nos dois modos; a diferença passa a ser só o vínculo).
- **Sincronizado**: grava `status_source = 'template'` + `status_template_id`, e
  as etapas criadas guardam `template_id`/`template_item_id` (permite futura
  re-sincronização).
- **Cópia Independente**: grava `status_source = 'custom'`, `status_template_id = null`
  e as etapas ficam sem vínculo.
- **Sem duplicar**: as etapas antigas do escopo são substituídas.

### 2. Nenhuma tarefa fica órfã
Antes de remover uma etapa antiga, as tarefas nela são remapeadas:

- por nome igual (ignorando maiúsculas/acentos) na etapa nova correspondente;
- se não houver nome equivalente, por categoria (`not_started`, `in_progress`,
  `done`…) para a primeira etapa nova daquela categoria;
- se ainda não houver destino, a etapa antiga **é preservada** ao final da lista
  em vez de apagada — assim nenhuma tarefa desaparece do Kanban.

### 3. Modelo passa a ter prioridade na leitura
Em `useStatuses.ts`: quando a lista/pasta/space está com
`status_source = 'template'` e um modelo vinculado, as etapas do modelo são a
fonte de verdade (hoje as próprias sempre vencem). Sem modelo vinculado,
continua exatamente como está hoje.

### 4. Tela atualiza sozinha
Invalidar também `statuses-for-scope`, `default-status-for-scope`, `tasks` e
`task` após aplicar, e mostrar no toast quantos locais foram atualizados.

## Detalhes técnicos

- Arquivos: `src/hooks/useStatusTemplates.ts`, `src/hooks/useStatuses.ts`.
  A UI (`StatusApplySection.tsx`) não muda de layout.
- Sem migration: `statuses` já tem `template_id`, `template_item_id`, `category`.
  A função existente `sync_template_statuses_for_list` continua válida e será
  usada como caminho de sincronização quando a lista não tiver conflito.
- Módulo isolado: a mudança fica na camada de status (hooks), sem tocar SSO,
  hub-inbox, automações ou importações.

## Validação

Aplicar o modelo na lista "Plan. de Criativos | Accerth" e conferir:
etapas do modelo aparecem no Kanban, sem colunas duplicadas, e as 57 tarefas
da lista continuam visíveis em alguma coluna.
