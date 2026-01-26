
## Plano: Corrigir Resolução de Mensagens do Chat

### Problema Identificado
A política RLS atual para UPDATE na tabela `chat_messages` permite apenas que o **remetente (sender)** atualize suas mensagens:
```sql
qual:(sender_id = auth.uid())
```

Quando uma mensagem é **atribuída a outro usuário** e esse usuário tenta clicar em "Resolver", a operação falha silenciosamente porque a RLS bloqueia a atualização.

---

### Solução

Adicionar uma nova política RLS que permita ao **assignee** resolver mensagens atribuídas a ele.

#### Nova Política RLS

```sql
CREATE POLICY "Assignees can resolve messages assigned to them"
ON chat_messages
FOR UPDATE
USING (assignee_id = auth.uid())
WITH CHECK (assignee_id = auth.uid());
```

Esta política permite que:
- O usuário atribuído (assignee) pode atualizar a mensagem
- Especificamente para definir `resolved_at` e `resolved_by`

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Nova migration SQL | Criar política RLS permitindo assignee resolver mensagens |

---

### Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────────────────┐
│  ANTES                                                           │
│  ────────                                                        │
│  User A envia mensagem atribuída a User B                        │
│  User B clica em "Resolver"                                      │
│  RLS bloqueia: sender_id != auth.uid() ❌                        │
│  Operação falha silenciosamente                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  DEPOIS                                                          │
│  ────────                                                        │
│  User A envia mensagem atribuída a User B                        │
│  User B clica em "Resolver"                                      │
│  RLS permite: assignee_id = auth.uid() ✅                        │
│  Mensagem marcada como resolvida                                 │
│  Toast: "Atribuição resolvida!"                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. Usuário atribuído (assignee) pode resolver mensagens tanto:
   - No chat diretamente (ChatMessageItem)
   - No card "Comentários atribuídos" da Home (AssignedCommentsCard)
2. Toast de sucesso exibido após resolução
3. Mensagem desaparece da lista de comentários atribuídos
4. Indicador "(resolvido)" aparece na mensagem do chat
