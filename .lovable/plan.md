

## Plano: Corrigir Multi-Seleção de Usuários para Seguidores e Responsáveis

### Problemas Identificados

1. **Diálogo Rápido (QuickAutomationButtons)** - Usa seletor único de usuário
2. **Categoria de Ações (actionCategories)** - Ações de responsável usam tipo `user` (singular) ao invés de `users`
3. **Execução de Automações (useApplyAutomations)** - `auto_assign_user` não suporta múltiplos usuários
4. **Execução por Mudança de Status (useStatusChangeAutomations)** - `executeAddAssignee` não suporta múltiplos usuários

---

### O que será corrigido

| Local | Problema | Correção |
|-------|----------|----------|
| QuickAutomationButtons.tsx | Seletor único para ambos | Usar `UserMultiSelect` e salvar como array `user_ids` |
| actionCategories.ts | Ações de responsável usam `user` | Mudar para `users` e `user_ids` |
| useApplyAutomations.ts | `auto_assign_user` espera único | Suportar array `user_ids` como `auto_add_follower` |
| useStatusChangeAutomations.ts | `executeAddAssignee` espera único | Loop para processar múltiplos usuários |

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/QuickAutomationButtons.tsx` | Substituir Select por UserMultiSelect para ambas ações |
| `src/components/automations/advanced/actionCategories.ts` | Mudar campos de `auto_assign_user` e `add_assignee` para usar `users` |
| `src/hooks/useApplyAutomations.ts` | Adicionar suporte a array em `auto_assign_user` |
| `src/hooks/useStatusChangeAutomations.ts` | Modificar `executeAddAssignee` para processar array |

---

### Seção Técnica

#### 1. Atualizar QuickAutomationButtons.tsx

Substituir o estado e o seletor por multi-select:

```tsx
// Estado: mudar de string para array
const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

// Validação: verificar se há pelo menos 1 selecionado
if (selectedUserIds.length === 0) {
  toast.error('Selecione pelo menos um usuário');
  return;
}

// Ao criar automação: usar user_ids (array)
await createAutomation.mutateAsync({
  // ...
  actionConfig: { user_ids: selectedUserIds },
  description: `${actionType === 'auto_assign_user' ? 'Atribuir' : 'Adicionar como seguidor'} ${selectedUserIds.length} usuário(s) em ${scopeName}`,
});

// UI: substituir Select por UserMultiSelect
<UserMultiSelect
  label="Selecione os usuários"
  users={members?.map(m => ({
    id: m.user_id,
    full_name: m.profile?.full_name || null,
    avatar_url: m.profile?.avatar_url || null
  })) || []}
  selectedIds={selectedUserIds}
  onSelectionChange={setSelectedUserIds}
  required
/>
```

#### 2. Atualizar actionCategories.ts

Mudar campos de responsável para usar `users`:

```typescript
{
  id: 'auto_assign_user',
  label: 'Atribuir responsável',
  description: 'Adicionar responsáveis à tarefa',
  icon: UserPlus,
  configFields: [
    { name: 'user_ids', label: 'Usuários', type: 'users', required: true }
  ]
},
{
  id: 'add_assignee',
  label: 'Adicionar responsável',
  description: 'Adicionar mais responsáveis à tarefa',
  icon: UserPlus,
  configFields: [
    { name: 'user_ids', label: 'Usuários', type: 'users', required: true }
  ]
},
```

#### 3. Atualizar useApplyAutomations.ts

Adicionar suporte a múltiplos usuários em `auto_assign_user`:

```typescript
if (automation.action_type === 'auto_assign_user') {
  // Support both user_ids (array) and legacy user_id (string)
  const userIds = actionConfig?.user_ids || (actionConfig?.user_id ? [actionConfig.user_id] : []);
  if (!userIds.length) continue;
  
  for (const userId of userIds) {
    const { error: assignError } = await supabase
      .from('task_assignees')
      .upsert({
        task_id: task.id,
        user_id: userId,
        source_type: automation.scope_type,
        source_id: automation.scope_id || automation.workspace_id,
      } as any, { onConflict: 'task_id,user_id' });

    if (!assignError) {
      result.assigneesAdded++;
    }
  }
}
```

#### 4. Atualizar useStatusChangeAutomations.ts

Modificar `executeAddAssignee` para processar múltiplos:

```typescript
const executeAddAssignee = async (
  info: StatusChangeInfo,
  config: Record<string, any> | null,
  automationName: string
): Promise<void> => {
  // Support both user_ids (array) and legacy user_id (string)
  const userIds = config?.user_ids || (config?.user_id ? [config.user_id] : []);
  if (!userIds.length) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const userId of userIds) {
    const { error } = await supabase
      .from('task_assignees')
      .upsert(
        { task_id: info.taskId, user_id: userId },
        { onConflict: 'task_id,user_id' }
      );

    if (error) {
      console.error('Error adding assignee:', error);
      continue;
    }
    
    // Buscar nome do usuário adicionado
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Registrar atividade
    await logAutomationActivity(info.taskId, user.id, 'assignee.added', {
      newValue: profile?.full_name || userId,
      metadata: { 
        assignee_id: userId,
        automation_name: automationName,
      },
    });
  }
  
  console.log(`${userIds.length} assignee(s) added to task ${info.taskId}`);
};
```

---

### Compatibilidade com Automações Existentes

Todas as mudanças mantêm compatibilidade retroativa:
- Se `user_ids` existir (array), usa ele
- Senão, se `user_id` existir (string), converte para array `[user_id]`
- Automações antigas continuam funcionando

---

### Resultado Esperado

1. Diálogo rápido permite selecionar múltiplos usuários para ambas ações
2. Builder avançado usa multi-select para responsáveis
3. Ao salvar, dados são gravados corretamente como `user_ids` (array)
4. Ao executar automação, todos os usuários selecionados são adicionados
5. Automações existentes com `user_id` único continuam funcionando

