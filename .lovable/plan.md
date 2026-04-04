

# Corrigir mapeamento de status ao aplicar automações em Spaces

## Problema encontrado

A automação "Transferência do Social Media > Criativos" foi aplicada no space "MAP | MAP Cliente", mas **os IDs de status não foram convertidos**. Os IDs `36745b3b...`, `d3ae2d45...`, etc. são de `status_template_items` — não existem como status reais. Por isso, quando a tarefa muda de status, o motor de automações compara IDs reais (`84159972...` = "Concluído") contra IDs de template inexistentes e nunca encontra correspondência.

**Causa raiz**: A função `remapAutomation` (linha 1007) usada por `useApplyTemplateAutomationsToSpaces` só mapeia `target_list_id` e `scope_id`. Ela **ignora completamente** `trigger_config.from_status_ids`, `trigger_config.to_status_ids` e `actions[].config.status_id`.

Já existe uma função `remapTemplateAutomationConfig` (linha 901) que faz exatamente esse mapeamento de status, mas ela só é usada na criação de Space a partir do template — não na aplicação em massa.

## Solução

### Arquivo: `src/hooks/useSpaceTemplates.ts`

**1. Na função `useApplyTemplateAutomationsToSpaces` (linha 1100):**
- Buscar os status do template (via `status_template_items` + `template_id` do space template)
- Buscar os status reais do space destino
- Criar um `statusIdMap` mapeando por nome
- Passar esse mapa para `remapAutomation`

**2. Na função `remapAutomation` (linha 1007):**
- Adicionar parâmetro `statusIdMap`
- Substituir a lógica manual de remap do `action_config` pela chamada a `remapTemplateAutomationConfig` (que já trata `from_status_ids`, `to_status_ids`, `status_id` em ações e condições)

### Lógica de mapeamento de status
```text
Template status_template_items:     Status reais do space destino:
  "A Fazer" (f5fb5e8d...)        →   "A Fazer" (02cd91a7...)
  "Em Progresso" (66131d04...)   →   "Em Progresso" (56149ca6...)
  "Env. Aprovação" (e8466a10...) →   "Env. Aprovação" (6fe27b5d...)
  "Concluído" (8bcbc13b...)      →   "Concluído" (84159972...)
```
Mapeamento feito por **nome** do status, considerando os status da lista de destino (scope) com fallback para status do workspace.

### Fluxo corrigido
1. Buscar `status_template_items` do template vinculado ao space template
2. Buscar status reais do space destino (por scope: list → folder → space → workspace)
3. Criar mapa `{templateStatusId → realStatusId}` por correspondência de nome
4. Usar `remapTemplateAutomationConfig` para aplicar o mapa no `action_config`
5. Inserir automação com IDs corretos

## Resultado
As automações aplicadas em massa terão os IDs de status corretos do space destino, permitindo que o motor de automações as execute quando o status da tarefa mudar.

