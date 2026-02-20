

# Reestruturar permissoes de Chat por cargo (Role)

## Resumo das regras

| Cargo | Criar canal | Visualizar | Interagir (enviar msg) | Editar/Excluir canal |
|-------|------------|------------|----------------------|---------------------|
| Convidado | Nao | Nao (rota bloqueada) | Nao | Nao |
| Membro Limitado | Nao | Apenas onde foi adicionado | Sim (onde foi adicionado) | Nao |
| Membro | Sim | Onde faz parte | Sim | Apenas os proprios |
| Admin/Proprietario | Sim | Todos | Sim | Todos |

## Alteracoes

### 1. Migracao SQL - Politicas RLS na tabela `chat_channels`

Reescrever as politicas de INSERT, SELECT, UPDATE e DELETE:

**INSERT (criar canal)**:
- Apenas membros com role `admin` ou `member` podem criar canais custom
- Bloqueia `guest` e `limited_member`

```sql
DROP POLICY IF EXISTS "Members can create channels" ON chat_channels;
CREATE POLICY "Members can create channels"
ON chat_channels FOR INSERT
WITH CHECK (
  created_by_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = chat_channels.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'member')
  )
);
```

**SELECT (visualizar canais)**:
- Dropar e recriar todas as politicas SELECT existentes
- Admin/owners veem todos os canais do workspace
- Membros e membros limitados veem canais space (se tem acesso ao space) e canais custom (se sao membros do canal)
- Criadores do canal custom tambem veem (resolve problema do INSERT...RETURNING)

```sql
-- Admins veem todos
CREATE POLICY "Admins can view all workspace channels"
ON chat_channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = chat_channels.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
  OR is_global_owner(auth.uid())
);

-- Space channels - quem tem acesso ao space
CREATE POLICY "Users can view space channels they have access to"
ON chat_channels FOR SELECT
USING (
  type = 'space' AND linked_space_id IS NOT NULL
  AND user_can_access_space(auth.uid(), linked_space_id)
);

-- Custom channels - membros do canal ou criador
CREATE POLICY "Users can view custom channels as members"
ON chat_channels FOR SELECT
USING (
  type = 'custom'
  AND (
    user_is_channel_member(auth.uid(), id)
    OR created_by_user_id = auth.uid()
  )
);
```

**UPDATE (editar canal)**:
- Admin/owners podem editar qualquer canal
- Criador pode editar o seu

```sql
DROP POLICY IF EXISTS "Channel owners can update channels" ON chat_channels;
DROP POLICY IF EXISTS "Space members can update space channels" ON chat_channels;

CREATE POLICY "Admins and creators can update channels"
ON chat_channels FOR UPDATE
USING (
  created_by_user_id = auth.uid()
  OR user_is_workspace_admin(auth.uid(), workspace_id)
);
```

**DELETE (excluir canal)**:
- Admin/owners podem excluir qualquer canal
- Criador pode excluir o seu (apenas custom)

```sql
DROP POLICY IF EXISTS "Channel owners can delete channels" ON chat_channels;

CREATE POLICY "Admins and creators can delete channels"
ON chat_channels FOR DELETE
USING (
  created_by_user_id = auth.uid()
  OR user_is_workspace_admin(auth.uid(), workspace_id)
);
```

### 2. Migracao SQL - Politicas de `chat_messages`

Adicionar politicas para que admins possam ver e enviar mensagens em qualquer canal:

```sql
-- Admins podem ver todas as mensagens do workspace
CREATE POLICY "Admins can view all messages"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_channels c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = chat_messages.channel_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
  )
  OR is_global_owner(auth.uid())
);

-- Admins podem enviar mensagens em qualquer canal
CREATE POLICY "Admins can send messages anywhere"
ON chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM chat_channels c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = chat_messages.channel_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'admin'
    )
    OR is_global_owner(auth.uid())
  )
);
```

### 3. Migracao SQL - Politicas de `chat_channel_members`

Admins podem gerenciar membros de qualquer canal:

```sql
-- Atualizar politicas para incluir admins do workspace
DROP POLICY IF EXISTS "Channel owners can add members" ON chat_channel_members;
DROP POLICY IF EXISTS "Channel owners can remove members" ON chat_channel_members;
DROP POLICY IF EXISTS "Channel owners can update members" ON chat_channel_members;

-- Admins e criadores podem gerenciar membros
CREATE POLICY "Channel owners and admins can manage members"
ON chat_channel_members FOR ALL
USING (
  is_global_owner(auth.uid())
  OR EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND (
      c.created_by_user_id = auth.uid()
      OR user_is_workspace_admin(auth.uid(), c.workspace_id)
    )
  )
);

-- Admins podem ver membros de todos os canais
DROP POLICY IF EXISTS "Users can view channel members" ON chat_channel_members;
CREATE POLICY "Users can view channel members"
ON chat_channel_members FOR SELECT
USING (
  is_global_owner(auth.uid())
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND (
      c.created_by_user_id = auth.uid()
      OR user_is_workspace_admin(auth.uid(), c.workspace_id)
    )
  )
  OR EXISTS (
    SELECT 1 FROM chat_channels c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = chat_channel_members.channel_id
    AND c.type = 'space'
    AND wm.user_id = auth.uid()
  )
);
```

### 4. Frontend - `ChatSidebar.tsx`

- Esconder o botao "+" (criar canal) para `limited_member` e `guest`
- Esconder o botao "Novo canal" na secao personalizada para esses cargos
- Permitir editar/excluir para admins/owners em qualquer canal

### 5. Frontend - `CreateChannelDialog.tsx`

- Nenhuma alteracao necessaria (a protecao ja vem do RLS e do botao escondido)

### 6. Frontend - Rota ja protegida

A rota `/chat` ja esta envolvida em `GuestBlockedRoute`, entao convidados ja nao tem acesso a pagina.

