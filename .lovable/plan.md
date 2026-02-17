

# Implementar Lógica "OU" de Gatilhos nas Automações de Template

## Problema
O dialog de automações de template (`TemplateAutomationDialog.tsx`) permite selecionar apenas **um gatilho**, enquanto o construtor de automações normais (`AdvancedAutomationBuilder.tsx`) ja suporta multiplos gatilhos com logica "OU". A funcionalidade precisa ser espelhada.

## Mudancas Necessarias

### 1. Atualizar `TemplateAutomationDialog.tsx`

**Estado:** Adicionar `selectedTriggers` (array) ao lado do `selectedTrigger` existente, replicando o padrao do `AdvancedAutomationBuilder`.

**Carregamento (useEffect de edicao):** Reconstruir os gatilhos "OU" a partir de `action_config.or_triggers`, assim:
```text
const orTriggers = (config.or_triggers as string[]) || [];
setSelectedTriggers([automation.trigger, ...orTriggers]);
```

**TriggerSelector:** Passar as props `selectedTriggers` e `onToggleTrigger` para habilitar o modo multi-selecao com checkboxes.

**Exibicao dos gatilhos selecionados:** Trocar a exibicao de gatilho unico por uma lista com badges "OU" entre eles, permitindo remover individualmente (exatamente como no `AdvancedAutomationBuilder`).

**Submissao (handleSubmit):** Separar o gatilho primario dos extras e salvar `or_triggers` no `action_config`:
```text
const primaryTriggerId = selectedTriggers[0];
const orTriggerIds = selectedTriggers.slice(1);
if (orTriggerIds.length > 0) {
  finalActionConfig.or_triggers = orTriggerIds;
}
```

**Reset:** Limpar `selectedTriggers` no `resetForm`.

### 2. Atualizar `TemplateAutomationsSection.tsx`

Exibir badges "OU" na listagem de automacoes do template, lendo `action_config.or_triggers` e mostrando todos os gatilhos concatenados, igual ao `AutomationCard.tsx`.

### 3. Garantir Compatibilidade no Apply

O hook `useApplyAutomations.ts` que aplica as automacoes criadas a partir de templates ja suporta `or_triggers` no `action_config`, entao nao precisa de mudancas no motor de execucao.

## Resumo de Arquivos Modificados

| Arquivo | Alteracao |
|---|---|
| `src/components/settings/TemplateAutomationDialog.tsx` | Adicionar estado multi-trigger, passar props ao TriggerSelector, salvar/carregar or_triggers, exibir badges OU |
| `src/components/settings/TemplateAutomationsSection.tsx` | Exibir badges OU na listagem |

## Detalhes Tecnicos

- O padrao sera copiado diretamente do `AdvancedAutomationBuilder.tsx` (linhas 47-48, 69-71, 157-173, 294-340, 354-370)
- Nenhuma alteracao de banco de dados necessaria -- `or_triggers` ja e armazenado dentro do campo JSONB `action_config`
- O `TriggerSelector` ja aceita as props `selectedTriggers` e `onToggleTrigger` opcionais

