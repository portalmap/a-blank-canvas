

# Análise: Automações ligadas a etiquetas não funcionam

## Problemas encontrados

### Problema Principal: Triggers `on_tag_added` e `on_tag_removed` não têm execução implementada

Os triggers "Etiqueta adicionada" e "Tag removida" existem na UI (podem ser configurados e salvos), mas **não há código no motor de execução que os dispare**. 

Quando uma tag é adicionada/removida (`useAddTaskTag` / `useRemoveTaskTag` em `useTaskTags.ts`), o código apenas chama `reevaluateConditionAutomations()`, que:
- Busca **somente** automações com `trigger === 'on_status_changed'` (linha 1392)
- Verifica se condições de tag foram satisfeitas nessas automações
- **Ignora completamente** automações cujo trigger primário é `on_tag_added` ou `on_tag_removed`

Ou seja: automações do tipo "Quando etiqueta X for adicionada → fazer Y" **nunca são disparadas**.

### Problema Secundário: `reevaluateConditionAutomations` ignora `or_triggers`

A função filtra por `trigger === 'on_status_changed'` direto (linha 1392), mas não verifica `or_triggers`. Se uma automação tem trigger primário diferente mas inclui `on_status_changed` como OR trigger, a re-avaliação não a encontra.

## Solução proposta

### 1. Criar função `executeTagAutomations` no motor de execução

Nova função em `src/hooks/useStatusChangeAutomations.ts` que:
- Recebe `taskId`, `workspaceId`, `tagId`, e `event` (`'on_tag_added'` ou `'on_tag_removed'`)
- Busca automações ativas no workspace
- Filtra por trigger primário ou `or_triggers` que incluam o evento
- Filtra por escopo (workspace → space → folder → list)
- Verifica `trigger_config.tag_ids`: se especificado, só dispara se o tagId está na lista
- Avalia condições adicionais (se houver)
- Executa as ações configuradas (single ou multi-action)

### 2. Chamar `executeTagAutomations` nos hooks de tag

Em `src/hooks/useTaskTags.ts`:
- No `onSuccess` de `useAddTaskTag`: chamar `executeTagAutomations(taskId, workspaceId, tagId, 'on_tag_added')`
- No `onSuccess` de `useRemoveTaskTag`: chamar `executeTagAutomations(taskId, workspaceId, tagId, 'on_tag_removed')`
- Manter a chamada existente de `reevaluateConditionAutomations` para condições em automações de status

### 3. Corrigir `reevaluateConditionAutomations` para considerar `or_triggers`

Alterar a query na linha 1392 para buscar todas as automações ativas do workspace e filtrar client-side por trigger primário ou `or_triggers`, igual já é feito em `executeStatusChangeAutomations` (linhas 480-484).

## Arquivos a editar

- **`src/hooks/useStatusChangeAutomations.ts`**: Adicionar `executeTagAutomations` e corrigir `reevaluateConditionAutomations`
- **`src/hooks/useTaskTags.ts`**: Importar e chamar `executeTagAutomations` nos hooks de add/remove tag

## Lógica da nova função

```text
executeTagAutomations(taskId, workspaceId, tagId, event)
  │
  ├── Buscar task → list → space/folder (hierarquia de escopo)
  ├── Buscar todas automações ativas do workspace
  ├── Filtrar por trigger === event OU or_triggers inclui event
  ├── Filtrar por escopo (workspace/space/folder/list)
  ├── Para cada automação:
  │   ├── Verificar trigger_config.tag_ids (se vazio = qualquer tag)
  │   ├── Avaliar conditions (se houver)
  │   ├── Verificar duplicata em automation_executions
  │   └── Executar ações via executeAction()
  └── Invalidar queries
```

Nenhuma migração de banco necessária.

