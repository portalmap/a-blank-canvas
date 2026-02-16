

# Adicionar funcao "OU" para gatilhos de automacao

## Problema

Atualmente, cada automacao suporta apenas um gatilho. O usuario quer poder selecionar multiplos gatilhos com logica "OU" -- por exemplo, disparar quando uma tarefa for **criada OU movida** para a lista.

## Abordagem

O banco de dados armazena um unico campo `trigger` (enum). Em vez de alterar o schema do banco, vamos armazenar os gatilhos adicionais no campo `action_config` como `or_triggers: string[]`. Isso evita migracoes e mantem compatibilidade com automacoes existentes.

## Detalhes Tecnicos

### 1. UI: Multi-selecao de gatilhos no `TriggerSelector`

**Arquivo: `src/components/automations/advanced/TriggerSelector.tsx`**

- Mudar de selecao unica para multi-selecao de triggers
- Prop `selectedTrigger: string | null` passa a conviver com `selectedTriggers: string[]` (ou armazenar no config como `or_triggers`)
- Ao clicar num trigger ja selecionado, desmarcar. Ao clicar num novo, adicionar
- Mostrar checkmarks em todos os selecionados
- Exibir badge "OU" entre os triggers selecionados no card resumo

### 2. UI: Exibir multiplos triggers no `AdvancedAutomationBuilder`

**Arquivo: `src/components/automations/advanced/AdvancedAutomationBuilder.tsx`**

- Atualizar o card de gatilho para mostrar multiplos triggers selecionados (com "OU" entre eles)
- Ao salvar, armazenar o primeiro trigger no campo `trigger` do DB e os demais em `action_config.or_triggers`
- Ao carregar (modo edicao), reconstruir a lista completa de triggers a partir de `trigger` + `action_config.or_triggers`
- Atualizar a descricao gerada para listar todos os triggers

### 3. Engine: Atualizar `useApplyAutomations.ts`

**Arquivo: `src/hooks/useApplyAutomations.ts`**

- Apos buscar automacoes, verificar tambem o campo `action_config.or_triggers` de cada automacao
- Uma automacao e aplicavel se o evento atual corresponder ao `trigger` principal OU a qualquer item em `or_triggers`
- Impacto: automacoes de criacao/movimentacao de tarefas

### 4. Engine: Atualizar `useStatusChangeAutomations.ts`

**Arquivo: `src/hooks/useStatusChangeAutomations.ts`**

- Mesma logica: ao buscar automacoes por trigger, tambem considerar automacoes cujo `or_triggers` inclua o trigger buscado
- Isso requer buscar automacoes de forma mais ampla e filtrar no cliente

### 5. Exibicao na lista de automacoes

**Arquivo: `src/components/automations/AutomationCard.tsx`**

- Ao exibir o trigger de uma automacao, verificar se existe `or_triggers` no config e mostrar todos os triggers concatenados com "OU"

## Resumo de arquivos modificados

1. `src/components/automations/advanced/TriggerSelector.tsx` -- multi-selecao
2. `src/components/automations/advanced/AdvancedAutomationBuilder.tsx` -- exibicao e persistencia
3. `src/hooks/useApplyAutomations.ts` -- engine de execucao
4. `src/hooks/useStatusChangeAutomations.ts` -- engine de execucao
5. `src/components/automations/AutomationCard.tsx` -- exibicao no card

## Nenhuma alteracao de banco de dados

Os triggers adicionais sao armazenados em `action_config.or_triggers`, aproveitando o campo JSON existente.

