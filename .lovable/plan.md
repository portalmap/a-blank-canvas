

# Corrigir 231 automações com IDs de status de template + prevenir para o futuro

## Diagnóstico completo

A automação `6ea47c48` ("Transferência do Social Media > Criativos") no Space MAP | MAP Cliente tem os seguintes IDs de status no `action_config`:

```text
trigger_config.from_status_ids:
  d3ae2d45 → "Aguardando" (template b7246826)  ❌ deveria ser 23493088 (real)
  f5fb5e8d → "A Fazer" (template b7246826)      ❌ deveria ser 02cd91a7
  66131d04 → "Em Progresso" (template b7246826)  ❌ deveria ser 56149ca6
  e8466a10 → "Env. Aprovação" (template b7246826)❌ deveria ser 6fe27b5d
  8bcbc13b → "Concluído" (template b7246826)     ❌ deveria ser 84159972

trigger_config.to_status_ids:
  36745b3b → "Concluído" (template f5475852)     ❌ deveria ser 84159972
  8bcbc13b → "Concluído" (template b7246826)     ❌ deveria ser 84159972

actions[4].config.status_id (set_status após move_task):
  46da2d87 → "Aguardando" (template 857a3b08)   ❌ deveria ser 0711eb62
```

A tarefa "Nova Tarefa" mudou para status `84159972` (Concluído real), mas a automação compara com IDs de template que não existem na tabela `statuses` — logo nunca dispara.

**São 231 automações afetadas** em todo o workspace.

## Causa raiz

A função `useApplyTemplateAutomationsToSpaces` faz o mapeamento de status por nome, mas a lógica não distingue qual template pertence a qual lista. Um template item "Concluído" pode corresponder ao status errado de outra lista. Além disso, para ações que referenciam listas de destino (set_status após move_task), o `status_id` precisa ser mapeado usando os statuses da **lista destino**, não da lista origem.

## Solução

### Parte 1: Corrigir as 231 automações existentes (script de dados)

Criar um script que:
1. Busca todas as automações com template status IDs no workspace
2. Para cada automação, identifica o `scope_id` (lista real)
3. Busca os statuses reais dessa lista
4. Busca os `status_template_items` referenciados no `action_config`
5. Cria mapa `{template_id → real_id}` por correspondência de nome
6. Para ações `set_status` com `target_list_id`, mapeia usando os statuses da lista destino
7. Atualiza o `action_config` com IDs corrigidos

### Parte 2: Corrigir o mapeamento futuro no código

**Arquivo: `src/hooks/useSpaceTemplates.ts`**

Corrigir a função `useApplyTemplateAutomationsToSpaces` para:
1. Buscar ALL status template items de TODOS os templates de status usados pelas listas do template
2. Para cada automação, construir um `statusIdMap` **por lista**: mapear template items do status template da lista fonte → statuses reais da lista real correspondente
3. Para ações com `target_list_id`, buscar os statuses da lista destino real e mapear separadamente os template items do template da lista destino
4. Unir todos os mapas em um único `statusIdMap` antes de chamar `remapTemplateAutomationConfig`

A lógica chave é: o mapa precisa cobrir IDs de template de TODAS as listas envolvidas (fonte e destino), cada um mapeado para o status real da lista real correspondente por nome.

## Arquivos alterados
- `src/hooks/useSpaceTemplates.ts` — corrigir lógica de mapeamento de status multi-lista
- Script de dados (via insert tool) — corrigir 231 automações existentes

