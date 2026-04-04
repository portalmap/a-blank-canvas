

# Expandir busca de automações para incluir nome do Space

## Problema

A busca atual filtra apenas pelo campo `description` da automação. Quando o usuário pesquisa um termo como "tráfego" ou o nome de um cliente (ex: "Delta Soluções"), automações que têm esse texto apenas no badge do Space não aparecem.

## Solução

### Arquivo: `src/components/automations/AutomationsList.tsx`

Expandir o filtro de busca (linhas 78-83) para procurar o termo em múltiplos campos:

1. **`description`** — título da automação (já existe)
2. **Nome do Space** — resolvido via `lists`/`folders`/`spaces` (o badge azul mostrado no card)
3. **Trigger label** e **Action label** — texto como "Etiqueta adicionada", "Mover tarefa"

A lógica será: se qualquer um dos campos contiver o termo buscado, a automação aparece.

```typescript
// Buscar em description + space name + trigger/action labels
if (filters?.searchTerm) {
  const searchLower = filters.searchTerm.toLowerCase();
  const description = automation.description?.toLowerCase() || '';
  
  // Resolver nome do space
  let spaceName = '';
  if (automation.scope_type === 'list') {
    const list = lists.find(l => l.id === automation.scope_id);
    const space = list ? spaces.find(s => s.id === list.space_id) : null;
    spaceName = space?.name?.toLowerCase() || '';
  } else if (automation.scope_type === 'folder') {
    const folder = folders.find(f => f.id === automation.scope_id);
    const space = folder ? spaces.find(s => s.id === folder.space_id) : null;
    spaceName = space?.name?.toLowerCase() || '';
  } else if (automation.scope_type === 'space') {
    const space = spaces.find(s => s.id === automation.scope_id);
    spaceName = space?.name?.toLowerCase() || '';
  }
  
  const matches = description.includes(searchLower) 
    || spaceName.includes(searchLower);
  if (!matches) return false;
}
```

## Resultado
- Pesquisar "tráfego" retorna automações com esse termo no título OU no nome do Space
- Pesquisar "Delta" retorna todas automações do Space "MAP | Delta Soluções"
- 1 arquivo editado

