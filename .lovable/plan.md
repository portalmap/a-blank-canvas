

## Plano: Corrigir Exclusão de Space com Cascade para Tarefas

### Problemas Identificados

1. **Constraint bloqueadora**: A tabela `tasks` tem `ON DELETE RESTRICT` na FK `list_id`, impedindo exclusão de listas com tarefas
2. **Política muito permissiva**: A RLS atual permite exclusão por `admin` e `member`, mas deveria ser **apenas admin** (proprietário do workspace)

---

### O que será corrigido

| Problema | Correção |
|----------|----------|
| Tarefas bloqueiam exclusão de lista | Alterar constraint para `ON DELETE CASCADE` |
| Qualquer membro pode excluir | Restringir para apenas `admin` |

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Nova migração SQL | Alterar FK e policy de exclusão |
| `src/hooks/useSpaces.ts` | Melhorar mensagem de erro |
| `src/components/workspace/SpaceTreeItem.tsx` | Adicionar verificação de permissão (ocultar botão para não-admin) |

---

### Seção Técnica

#### 1. Migração de Banco de Dados

```sql
-- 1. Alterar constraint para permitir exclusão em cascata
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_list_id_fkey,
  ADD CONSTRAINT tasks_list_id_fkey 
    FOREIGN KEY (list_id) 
    REFERENCES public.lists(id) 
    ON DELETE CASCADE;

-- 2. Restringir exclusão de space para apenas admin
DROP POLICY IF EXISTS "Only privileged members can delete spaces" ON public.spaces;
CREATE POLICY "Only admins can delete spaces"
ON public.spaces
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = spaces.workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'
  )
  OR is_system_admin(auth.uid())
);
```

#### 2. Atualizar `useSpaces.ts`

Melhorar tratamento de erro para informar o motivo:

```typescript
onError: (error: any) => {
  console.error('Erro ao excluir space:', error);
  
  if (error.code === '23503') {
    toast.error('Não é possível excluir: existem tarefas vinculadas');
  } else if (error.code === '42501') {
    toast.error('Você não tem permissão para excluir este space');
  } else {
    toast.error('Erro ao excluir space');
  }
},
```

#### 3. Atualizar `SpaceTreeItem.tsx`

Ocultar opção de excluir para não-administradores:

```tsx
// Adicionar verificação de permissão
const { data: userRole } = useUserRole();
const canDelete = userRole?.isAdmin;

// No menu dropdown
{canDelete && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onClick={() => setIsDeleteDialogOpen(true)}
      className="text-destructive"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Excluir Space
    </DropdownMenuItem>
  </>
)}
```

---

### Comportamento Após Correção

1. **Exclusão funcional**: Ao excluir um Space, todas as pastas, listas e tarefas serão excluídas em cascata
2. **Permissão restrita**: Apenas administradores do workspace (role = 'admin') ou administradores globais podem excluir
3. **UI correta**: Botão de excluir só aparece para usuários com permissão
4. **Mensagens claras**: Erros específicos quando algo impede a exclusão

---

### Resultado Esperado

- Administradores podem excluir Spaces (e todo seu conteúdo)
- Membros comuns não veem a opção de excluir
- Não há mais erro de foreign key ao excluir

