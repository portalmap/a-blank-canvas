

## Plano: Adicionar Workspace Padrão para Abertura Automática

### Resumo

Para usuários com mais de um workspace, será adicionada uma opção para definir qual workspace abre automaticamente ao entrar no sistema. Isso evita a necessidade de selecionar manualmente o workspace toda vez que atualizar a página.

---

### O que será implementado

1. **Indicador visual** no card do workspace padrão (ícone de estrela)
2. **Botão para definir como padrão** no hover de cada workspace
3. **Seleção automática** do workspace padrão ao carregar o sistema
4. **Persistência** da preferência no banco de dados (tabela `profiles`)

---

### Interface do Usuário

Na tela de "Meus Workspaces":
- Cada workspace terá um botão de "estrela" que aparece no hover
- O workspace padrão mostrará uma estrela preenchida amarela
- Clicar na estrela define/remove o workspace como padrão
- O workspace padrão terá um badge "Padrão" visível

---

### Fluxo do Sistema

1. Usuário faz login
2. Sistema verifica se há `default_workspace_id` no perfil
3. Se existir e o usuário tiver acesso → ativa automaticamente e navega para `/spaces`
4. Se não existir → mostra tela de seleção de workspaces normalmente

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| **Banco de Dados** | Adicionar coluna `default_workspace_id` na tabela `profiles` |
| `src/contexts/WorkspaceContext.tsx` | Buscar e aplicar workspace padrão automaticamente |
| `src/pages/WorkspaceOverview.tsx` | Adicionar botão de estrela para definir padrão |
| `src/hooks/useWorkspaces.ts` | Adicionar hooks para gerenciar workspace padrão |
| `src/components/settings/UserProfile.tsx` | Adicionar seletor de workspace padrão |

---

### Seção Técnica

#### 1. Migração do Banco de Dados

```sql
ALTER TABLE profiles 
ADD COLUMN default_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;
```

#### 2. Hook para gerenciar workspace padrão

Adicionar em `useWorkspaces.ts`:

```typescript
export const useDefaultWorkspace = () => {
  return useQuery({
    queryKey: ['default-workspace'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();
      
      if (error || !data?.default_workspace_id) return null;
      return data.default_workspace_id;
    },
  });
};

export const useSetDefaultWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workspaceId: string | null) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('profiles')
        .update({ default_workspace_id: workspaceId })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-workspace'] });
      toast.success('Workspace padrão atualizado!');
    },
  });
};
```

#### 3. WorkspaceContext - Auto-seleção

Modificar o `WorkspaceProvider` para buscar e aplicar o workspace padrão:

```typescript
// Após validar que não há workspace ativo e o usuário tem mais de 1 workspace
useEffect(() => {
  const loadDefaultWorkspace = async () => {
    if (activeWorkspace || !user) return;
    
    // Buscar workspace padrão do perfil
    const { data } = await supabase
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', user.id)
      .single();
    
    if (data?.default_workspace_id) {
      // Buscar dados completos do workspace
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', data.default_workspace_id)
        .single();
      
      if (workspace) {
        setActiveWorkspace(workspace);
      }
    }
  };
  
  loadDefaultWorkspace();
}, [user, activeWorkspace]);
```

#### 4. WorkspaceOverview - UI de Seleção

```tsx
import { Star } from 'lucide-react';
import { useDefaultWorkspace, useSetDefaultWorkspace } from '@/hooks/useWorkspaces';

// No componente
const { data: defaultWorkspaceId } = useDefaultWorkspace();
const setDefaultWorkspace = useSetDefaultWorkspace();

const handleToggleDefault = (workspaceId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  const newDefault = defaultWorkspaceId === workspaceId ? null : workspaceId;
  setDefaultWorkspace.mutate(newDefault);
};

// No card do workspace
<Button
  variant="ghost"
  size="icon"
  onClick={(e) => handleToggleDefault(workspace.id, e)}
>
  <Star 
    className={`h-4 w-4 ${
      defaultWorkspaceId === workspace.id 
        ? 'fill-yellow-400 text-yellow-400' 
        : 'text-muted-foreground'
    }`} 
  />
</Button>
{defaultWorkspaceId === workspace.id && (
  <Badge variant="secondary" className="text-xs">Padrão</Badge>
)}
```

#### 5. UserProfile - Seletor Alternativo

Adicionar um seletor no perfil do usuário para escolher o workspace padrão:

```tsx
<div className="space-y-2">
  <Label>Workspace Padrão</Label>
  <Select 
    value={defaultWorkspaceId || ''} 
    onValueChange={(value) => setDefaultWorkspace.mutate(value || null)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Nenhum (mostrar seleção)" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Nenhum (mostrar seleção)</SelectItem>
      {workspaces?.map(w => (
        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-sm text-muted-foreground">
    Este workspace será selecionado automaticamente ao abrir o sistema
  </p>
</div>
```

---

### Resultado Esperado

1. Usuários com múltiplos workspaces podem marcar um como "padrão"
2. Ao abrir o sistema, o workspace padrão é selecionado automaticamente
3. Usuário é redirecionado diretamente para `/spaces` sem passar por `/workspaces`
4. A preferência persiste entre sessões no banco de dados
5. A configuração pode ser alterada na tela de workspaces ou nas configurações de perfil

