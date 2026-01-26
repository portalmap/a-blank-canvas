
## Plano: Status da Ação Baseado na Lista de Destino do "Mover Tarefa"

### Problema Atual
Quando há múltiplas ações em sequência:
1. **Mover tarefa** → seleciona "Plan. de Criativos" como destino
2. **Alterar status** → mostra status do escopo original, não da lista de destino

O campo de status na ação "Alterar status" deveria mostrar os status da lista selecionada na ação "Mover tarefa" acima, pois a tarefa já terá sido movida quando essa ação for executada.

---

### Solução

Modificar o `MultiActionSelector` para detectar se existe uma ação `move_task` anterior e passar o `target_list_id` como escopo para as ações subsequentes.

---

### Mudanças Necessárias

#### 1. Modificar `MultiActionSelector.tsx`

Adicionar lógica para determinar o escopo efetivo de cada ação baseado nas ações anteriores:

```typescript
// Função para encontrar o escopo efetivo de uma ação
const getEffectiveScopeForAction = (actionIndex: number) => {
  // Procurar ação "move_task" anterior com lista configurada
  for (let i = actionIndex - 1; i >= 0; i--) {
    const prevAction = actions[i];
    if (prevAction.type === 'move_task' && prevAction.config?.target_list_id) {
      return {
        scopeType: 'list' as const,
        scopeId: prevAction.config.target_list_id,
      };
    }
  }
  // Se não encontrar, usar o escopo original
  return { scopeType, scopeId };
};
```

No render do `ActionConfigForm`, passar o escopo efetivo:

```tsx
{actions.map((action, index) => {
  const effectiveScope = getEffectiveScopeForAction(index);
  
  return (
    <Card key={action.id} className="p-3">
      {/* ... */}
      {action.type && (
        <ActionConfigForm
          actionId={action.type}
          workspaceId={workspaceId}
          config={action.config}
          onConfigChange={(config) => handleUpdateActionConfig(action.id, config)}
          scopeType={effectiveScope.scopeType}
          scopeId={effectiveScope.scopeId}
          isTemplateContext={isTemplateContext}
          templateLists={templateLists}
          templateFolders={templateFolders}
        />
      )}
    </Card>
  );
})}
```

---

### Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────────────────┐
│  ANTES                                                           │
│  ────────                                                        │
│  Ação 1: Mover tarefa → Plan. de Criativos                       │
│  Ação 5: Alterar status → Mostra status do escopo ORIGINAL       │
│                                                                  │
│  Status listados: status da lista/space de origem ❌              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  DEPOIS                                                          │
│  ────────                                                        │
│  Ação 1: Mover tarefa → Plan. de Criativos                       │
│  Ação 5: Alterar status → Mostra status de "Plan. de Criativos"  │
│                                                                  │
│  Status listados: status da lista de DESTINO ✅                   │
└──────────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/advanced/MultiActionSelector.tsx` | Adicionar função `getEffectiveScopeForAction` e usar no render de cada ação |

---

### Comportamento Esperado

1. Usuário adiciona ação "Mover tarefa" e seleciona lista de destino
2. Usuário adiciona ação "Alterar status" abaixo
3. O seletor de status mostra automaticamente os status da lista de destino
4. Se o usuário mudar a lista de destino no "Mover tarefa", o seletor de status atualiza automaticamente
5. Se não houver ação "Mover tarefa" anterior, usa o escopo original da automação

---

### Detalhes Técnicos

O hook `useStatusesForScope` já suporta buscar status por lista, então basta passar:
- `scopeType: 'list'`
- `scopeId: target_list_id` (da ação move_task anterior)

Para contexto de **template**, a lógica também funciona pois os `templateLists` passam os IDs de referência que serão mapeados quando o template for aplicado.
