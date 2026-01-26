

## Plano: Corrigir Escopo de Status para Ações de Automação em Templates

### Problema Identificado

Ao investigar o código, descobri que o `TemplateAutomationDialog` **não passa o escopo do gatilho** para o `MultiActionSelector`:

```tsx
// Linha 506-513 - FALTA scopeType e scopeId
<MultiActionSelector
  workspaceId={workspaceId}
  actions={actions}
  onActionsChange={setActions}
  isTemplateContext={true}
  templateLists={...}
  templateFolders={...}
  // ❌ NÃO PASSA: scopeType, scopeId
/>
```

Portanto, quando `getEffectiveScopeForAction` não encontra uma ação `move_task` anterior, ela retorna `{ scopeType: undefined, scopeId: undefined }`, fazendo o hook `useStatusesForScope` buscar os status do workspace inteiro.

---

### Solução

Passar o escopo do gatilho (`scopeType`, `listRefId`) do `TemplateAutomationDialog` para o `MultiActionSelector`, garantindo que:

1. **Se houver ação `move_task` anterior** → usa o `target_list_id` dessa ação
2. **Se não houver** → usa o escopo do gatilho (lista selecionada no escopo do template)

---

### Mudanças Necessárias

#### 1. Modificar `TemplateAutomationDialog.tsx`

Passar as props de escopo para o `MultiActionSelector`:

```tsx
<MultiActionSelector
  workspaceId={workspaceId}
  actions={actions}
  onActionsChange={setActions}
  scopeType={scopeType}                    // ← ADICIONAR
  scopeId={listRefId || folderRefId}       // ← ADICIONAR
  isTemplateContext={true}
  templateLists={lists.map(l => ({ id: l.id, name: l.name, folder_ref_id: l.folder_ref_id }))}
  templateFolders={folders.map(f => ({ id: f.id, name: f.name }))}
/>
```

E também para o `ActionConfigForm` no modo de ação única (linhas 552-560):

```tsx
<ActionConfigForm
  actionId={selectedAction}
  workspaceId={workspaceId}
  config={actionConfig}
  onConfigChange={setActionConfig}
  scopeType={scopeType}                    // ← ADICIONAR
  scopeId={listRefId || folderRefId}       // ← ADICIONAR
  isTemplateContext={true}
  templateLists={lists.map(l => ({ id: l.id, name: l.name, folder_ref_id: l.folder_ref_id }))}
  templateFolders={folders.map(f => ({ id: f.id, name: f.name }))}
/>
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/settings/TemplateAutomationDialog.tsx` | Passar `scopeType` e `scopeId` para `MultiActionSelector` e `ActionConfigForm` |

---

### Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────────────────┐
│  ANTES                                                           │
│  ────────                                                        │
│  Escopo do template: Lista "Tráfego Pago"                        │
│  Ação 1: Mover tarefa → Plan. de Criativos                       │
│  Ação 5: Alterar status → scopeType=undefined, scopeId=undefined │
│                                                                  │
│  Status listados: status do workspace inteiro ❌                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  DEPOIS                                                          │
│  ────────                                                        │
│  Escopo do template: Lista "Tráfego Pago"                        │
│  Ação 1: Mover tarefa → Plan. de Criativos                       │
│  Ação 5: Alterar status → scopeType='list', scopeId='plan...'    │
│                                                                  │
│  Status listados: status de "Plan. de Criativos" ✅               │
└──────────────────────────────────────────────────────────────────┘
```

Se não houver ação "Mover tarefa":

```text
┌──────────────────────────────────────────────────────────────────┐
│  SEM MOVE_TASK                                                   │
│  ────────                                                        │
│  Escopo do template: Lista "Tráfego Pago"                        │
│  Ação 1: Alterar status → scopeType='list', scopeId='trafego...' │
│                                                                  │
│  Status listados: status de "Tráfego Pago" (escopo gatilho) ✅    │
└──────────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. Quando há ação "Mover tarefa" antes, "Alterar status" mostra os status da lista de **destino**
2. Quando não há "Mover tarefa", "Alterar status" mostra os status do **escopo do gatilho**
3. Se mudar a lista de destino em "Mover tarefa", os status em "Alterar status" atualizam automaticamente

