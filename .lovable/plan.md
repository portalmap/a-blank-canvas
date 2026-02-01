

## Plano: Corrigir ScopeSelector para Resolver Hierarquia ao Editar Automação

### Problema Identificado

O `ScopeSelector.tsx` usa estados locais (`selectedSpaceId`, `selectedFolderId`) para controlar os selects em cascata. Quando uma automação é **criada**, funciona normalmente porque o usuário seleciona de cima para baixo.

**Porém, ao editar**, o componente recebe apenas `value.scopeId` (ex: ID da lista), mas não sabe qual é o Space e Pasta correspondentes. Os selects aparecem vazios porque `selectedSpaceId` nunca é preenchido.

### Evidência do Banco de Dados

As automações estão salvas corretamente:
- `scope_type: list`
- `scope_id: 5e59fcb6-f533-485b-9f68-c0b02382cff9` (Lista: "Tráfego Pago | Empresa Teste")
- Essa lista pertence ao Space: "MAP | Empresa Teste"
- Ela está na Pasta: `d80a9002-cb7f-4da2-b9bf-bc9b869bc568`

---

### Solução

Adicionar lógica no `ScopeSelector` para resolver a hierarquia reversa quando o componente é montado em modo de edição:

1. **Se `scopeType === 'list'`**: Buscar a lista pelo ID → obter `space_id` e `folder_id`
2. **Se `scopeType === 'folder'`**: Buscar a pasta pelo ID → obter `space_id`
3. **Se `scopeType === 'space'`**: Usar o `scopeId` como `selectedSpaceId`

---

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/ScopeSelector.tsx` | Adicionar resolução reversa da hierarquia |

---

### Seção Técnica

#### Mudanças no ScopeSelector.tsx

```typescript
import { useList } from '@/hooks/useLists';
import { useFolderById } from '@/hooks/useFolders'; // Precisamos criar ou verificar se existe

// Dentro do componente
const { data: spaces = [] } = useSpaces(workspaceId);

// Resolver hierarquia reversa baseado no scope atual
const listIdToResolve = value.scopeType === 'list' ? value.scopeId : undefined;
const folderIdToResolve = value.scopeType === 'folder' ? value.scopeId : undefined;

// Buscar dados da lista se necessário
const { data: resolvedList } = useList(listIdToResolve);

// Buscar dados da pasta se necessário (ou se a lista tiver folder_id)
const folderToFetch = folderIdToResolve || resolvedList?.folder_id;
const { data: resolvedFolder } = useFolderById(folderToFetch);

// Efeito para preencher os estados locais quando os dados são carregados
useEffect(() => {
  if (value.scopeType === 'space' && value.scopeId) {
    setSelectedSpaceId(value.scopeId);
    setSelectedFolderId(undefined);
  } else if (value.scopeType === 'folder' && resolvedFolder) {
    setSelectedSpaceId(resolvedFolder.space_id);
    setSelectedFolderId(resolvedFolder.id);
  } else if (value.scopeType === 'list' && resolvedList) {
    setSelectedSpaceId(resolvedList.space_id);
    setSelectedFolderId(resolvedList.folder_id || undefined);
  }
}, [value.scopeType, value.scopeId, resolvedList, resolvedFolder]);
```

#### Verificar/Criar hook useFolderById

Verificar se existe um hook para buscar pasta por ID. Se não existir:

```typescript
// Em useFolders.ts
export const useFolderById = (folderId?: string) => {
  return useQuery({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      if (!folderId) return null;
      
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!folderId,
  });
};
```

---

### Comportamento Após Correção

1. **Ao abrir uma automação para edição**:
   - Se o escopo é "lista", o sistema busca a lista → preenche Space e Pasta automaticamente
   - Se o escopo é "pasta", o sistema busca a pasta → preenche o Space
   - Se o escopo é "space", usa diretamente o ID

2. **Os selects aparecem corretamente preenchidos**
3. **As ações que dependem de listas/status também funcionam** pois o contexto está correto

---

### Resultado Esperado

- Ao abrir a automação "Automação de transferência do Tráfego Pago > Designer" para edição:
  - O select "Space" mostra "MAP | Empresa Teste"
  - O select "Pasta" mostra a pasta correta
  - O select "Lista" mostra "Tráfego Pago | Empresa Teste"
  - A ação "Lista de destino" mostra "Designer/Edição de Vídeo | Empresa Teste"

