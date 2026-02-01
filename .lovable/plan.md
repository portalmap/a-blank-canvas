

## Plano: Seleção Múltipla de Usuários para Ação "Adicionar Seguidor"

### Resumo

Permitir a seleção de múltiplos usuários nas ações de automação "Adicionar seguidor" e similares. Atualmente, só é possível selecionar um usuário por vez. Com esta alteração, será possível selecionar vários usuários de uma vez, usando uma interface similar à de seleção de tags e status.

---

### O que será implementado

1. **Novo componente `UserMultiSelect`** - Interface visual com checkboxes para selecionar múltiplos usuários
2. **Novo tipo de campo `users`** - Para indicar seleção múltipla de usuários
3. **Atualização das ações de seguidor** - Usar o novo tipo de campo
4. **Renderização no formulário** - Suporte ao novo campo no `ActionConfigForm`
5. **Atualização da lógica de execução** - Processar array de `user_ids` ao aplicar automações

---

### Interface do Usuário

Ao configurar uma automação de "Adicionar seguidor":
- O seletor atual (dropdown único) será substituído por um multi-select
- Usuários selecionados aparecem como badges
- Campo de busca para filtrar membros
- Opção "Marcar tudo" / "Limpar"
- Checkboxes ao lado de cada usuário

---

### Arquivos a Modificar/Criar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/advanced/UserMultiSelect.tsx` | **Novo** - Componente de seleção múltipla |
| `src/components/automations/advanced/actionCategories.ts` | Adicionar tipo `users` e atualizar ações |
| `src/components/automations/advanced/ActionConfigForm.tsx` | Renderizar novo componente para tipo `users` |
| `src/hooks/useApplyAutomations.ts` | Processar array de `user_ids` ao invés de único `user_id` |

---

### Seção Técnica

#### 1. Novo componente `UserMultiSelect.tsx`

Baseado no padrão do `StatusMultiSelect`:

```tsx
interface UserItem {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface UserMultiSelectProps {
  label: string;
  placeholder?: string;
  users: UserItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const UserMultiSelect = ({
  label,
  placeholder = 'Selecione usuários...',
  users,
  selectedIds,
  onSelectionChange,
}: UserMultiSelectProps) => {
  // Popover com Command (busca) + lista com checkboxes
  // Badges mostrando usuários selecionados
  // Botão "Marcar tudo" / "Limpar"
};
```

#### 2. Atualizar `actionCategories.ts`

Adicionar novo tipo e atualizar ações de seguidor:

```typescript
export interface ActionConfigField {
  name: string;
  label: string;
  type: 'select' | 'text' | 'user' | 'users' | 'status' | ...;  // Adicionar 'users'
  // ...
}

// Atualizar ações de seguidor
{
  id: 'auto_add_follower',
  label: 'Adicionar seguidor',
  configFields: [
    { name: 'user_ids', label: 'Usuários', type: 'users', required: true }  // Mudar de user_id para user_ids
  ]
},
{
  id: 'add_follower',
  label: 'Adicionar seguidor',
  configFields: [
    { name: 'user_ids', label: 'Usuários', type: 'users', required: true }
  ]
}
```

#### 3. Atualizar `ActionConfigForm.tsx`

Adicionar novo case para renderizar o componente:

```tsx
case 'users':
  return (
    <UserMultiSelect
      label={field.label}
      users={members?.map(m => ({
        id: m.user_id,
        full_name: m.profile?.full_name || null,
        avatar_url: m.profile?.avatar_url || null
      })) || []}
      selectedIds={config[field.name] || []}
      onSelectionChange={(ids) => handleFieldChange(field.name, ids)}
    />
  );
```

#### 4. Atualizar `useApplyAutomations.ts`

Processar array de usuários:

```typescript
// Antes:
const userId = actionConfig?.user_id;
if (!userId) continue;

// Depois:
const userIds = actionConfig?.user_ids || (actionConfig?.user_id ? [actionConfig.user_id] : []);
if (!userIds.length) continue;

// Loop para cada usuário selecionado
for (const userId of userIds) {
  if (automation.action_type === 'auto_add_follower') {
    await supabase
      .from('task_followers')
      .upsert({
        task_id: task.id,
        user_id: userId,
        source_type: automation.scope_type,
        source_id: automation.scope_id || automation.workspace_id,
      }, { onConflict: 'task_id,user_id' });
    
    result.followersAdded++;
  }
}
```

---

### Compatibilidade com Automações Existentes

O código manterá compatibilidade com automações já criadas que usam `user_id` (singular):
- Se `user_ids` existir (array), usa ele
- Senão, se `user_id` existir (string), converte para array `[user_id]`
- Isso garante que automações antigas continuem funcionando

---

### Resultado Esperado

1. Ao criar/editar automação "Adicionar seguidor", aparece multi-select
2. Usuário pode marcar múltiplos membros
3. Badges mostram os selecionados (com "+N" se houver muitos)
4. Ao executar a automação, todos os usuários selecionados são adicionados como seguidores
5. Automações antigas com único usuário continuam funcionando

