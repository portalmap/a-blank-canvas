
# Corrigir lógica OU nas condições de automações com gatilho de tag

## Problema identificado

A automação `9e529c86` ("Transferência de Criativos > Designer / Editor de Vídeo") tem:

- **Gatilho**: `on_tag_added`
- **trigger_config.tag_ids**: `["8fddbcf6"]` → apenas "enviar designer"
- **Condições**: tag contém "enviar designer" **OU** tag contém "enviar editor de vídeo"

Quando o usuário adiciona a tag "enviar editor de vídeo" a uma tarefa, o motor de automações filtra por `trigger_config.tag_ids` **antes** de avaliar as condições. Como o ID da tag adicionada (`1da76d09` = "enviar editor de vídeo") não está em `tag_ids`, a automação é descartada na linha 1425 do `executeTagAutomations` — as condições OU nunca são sequer avaliadas.

O mesmo problema existe na automação `b05b081f` (gatilho `on_status_changed`) — esta funciona porque não tem `tag_ids` no trigger_config.

## Solução

### Arquivo: `src/hooks/useStatusChangeAutomations.ts`

Na função `executeTagAutomations` (linhas 1422-1428), quando a automação possui condições com campo `tag`, ignorar o filtro `trigger_config.tag_ids` e delegar a validação de tags inteiramente às condições:

```typescript
// Antes (linha 1422-1428):
const triggerConfig = actionConfig?.trigger_config;
if (triggerConfig?.tag_ids && Array.isArray(triggerConfig.tag_ids) && triggerConfig.tag_ids.length > 0) {
  if (!triggerConfig.tag_ids.includes(tagId)) {
    continue;
  }
}

// Depois:
const triggerConfig = actionConfig?.trigger_config;
const conditions = actionConfig?.conditions as AutomationCondition[] | undefined;
const hasTagConditions = conditions?.some(c => c.field === 'tag');

// Se tem condições de tag, delegar a filtragem às condições (suporta OR)
// Se não tem condições de tag, usar tag_ids do trigger como filtro
if (!hasTagConditions && triggerConfig?.tag_ids?.length > 0) {
  if (!triggerConfig.tag_ids.includes(tagId)) {
    continue;
  }
}
```

Isso faz com que automações com condições de tag (incluindo OU) sejam avaliadas independente de qual tag foi adicionada, e as condições decidem se a automação deve executar ou não.

## Resultado
- Adicionar "enviar editor de vídeo" → condições avaliadas → OU verdadeiro → automação executa
- Adicionar "enviar designer" → condições avaliadas → OU verdadeiro → automação executa
- 1 arquivo editado, ~5 linhas alteradas
