

# Aplicar Status Padrão do Workspace automaticamente com hierarquia de prioridades

## Problema atual

O hook `useStatusesForScope` só verifica status customizados para **listas** (via `status_source === 'template'`). Para **folders** e **spaces**, ignora completamente se têm statuses próprios e cai direto no fallback do workspace. Além disso, não há herança hierárquica (lista herdar do folder, folder herdar do space).

## Hierarquia de prioridades desejada

```text
Lista → Folder → Space → Workspace (padrão automático)
         ↑          ↑         ↑
   Se a lista    Se o folder  Se o space
   tem template  tem template  tem template
   ou custom,    ou custom,    ou custom,
   usa esses     usa esses     usa esses
```

**Regra**: O primeiro nível que tiver statuses configurados (template ou custom) é utilizado. Se nenhum nível tiver, usa os **Status Padrão do Workspace** automaticamente.

## Alteração

**Arquivo: `src/hooks/useStatuses.ts`** — Reescrever a lógica de `useStatusesForScope` e `useDefaultStatusForScope`

### Nova lógica de `useStatusesForScope`:

1. **Se scopeType é `list`**:
   - Buscar dados da lista (`status_source`, `status_template_id`, `folder_id`, `space_id`)
   - Se lista tem `status_source === 'template'` ou `'custom'` → buscar `statuses` com `scope_type='list'` e `scope_id=listId`
   - Se não encontrou → verificar **folder** (se existir): buscar `folder.status_source` e `statuses` com `scope_type='folder'`
   - Se não encontrou → verificar **space**: buscar `space.status_source` e `statuses` com `scope_type='space'`
   - Se não encontrou → usar statuses do **workspace** (padrão automático)

2. **Se scopeType é `folder`**:
   - Buscar dados do folder (`status_source`, `status_template_id`, `space_id`)
   - Se folder tem statuses próprios → usar
   - Se não → verificar **space**
   - Se não → usar **workspace**

3. **Se scopeType é `space`**:
   - Buscar dados do space (`status_source`, `status_template_id`)
   - Se space tem statuses próprios → usar
   - Se não → usar **workspace**

4. **Se scopeType é `workspace`** → usar statuses do workspace diretamente

### Mesma lógica para `useDefaultStatusForScope`:
Aplicar a mesma cadeia hierárquica para encontrar o status default correto.

### Helper interno:
Criar função auxiliar `fetchScopedStatuses(scopeType, scopeId)` que busca statuses para um escopo específico, retornando `null` se não existirem, para evitar duplicação de código.

## Impacto

- Nenhuma migração de banco necessária (a tabela `statuses` já suporta `scope_type` para list/folder/space/workspace)
- Os dados já existem no banco quando templates são aplicados a folders/spaces
- Apenas 1 arquivo editado: `src/hooks/useStatuses.ts`
- Todos os componentes que usam `useStatusesForScope` se beneficiam automaticamente

