

# Expandir seleção de destinatários na ação "Enviar notificação"

## Objetivo

Permitir que a ação "Enviar notificação" nas automações envie para destinatários dinâmicos além de usuários específicos: **criador da tarefa**, **responsáveis da tarefa** e **seguidores da tarefa**.

## Alterações

### 1. `src/components/automations/advanced/actionCategories.ts`

Alterar o campo `user_id` (type `user`) da ação `send_notification` para um novo tipo `notification_target` que suportará tanto usuários específicos quanto papéis dinâmicos:

```typescript
{
  id: 'send_notification',
  configFields: [
    { name: 'message', label: 'Mensagem', type: 'text', required: true },
    { name: 'target_type', label: 'Destinatários', type: 'notification_target', required: true }
  ]
}
```

Adicionar `'notification_target'` ao union type de `ActionConfigField.type`.

### 2. `src/components/automations/advanced/ActionConfigForm.tsx`

Adicionar um novo `case 'notification_target'` no `renderField` que renderiza:

- Um **Select** para escolher o tipo de destinatário:
  - `specific_users` — Usuários específicos
  - `task_creator` — Criador da tarefa
  - `task_assignees` — Responsáveis da tarefa
  - `task_followers` — Seguidores da tarefa

- Se `specific_users` for selecionado, mostrar o `UserMultiSelect` abaixo para escolher os usuários.
- Caso contrário, nenhum campo adicional (o motor resolve dinamicamente).

Os valores são salvos no config como:
```json
{ "target_type": "task_assignees", "message": "..." }
// ou
{ "target_type": "specific_users", "user_ids": ["uuid1", "uuid2"], "message": "..." }
```

### 3. `src/hooks/useStatusChangeAutomations.ts` — `executeSendNotification`

Atualizar a função para resolver os destinatários dinamicamente com base no `target_type`:

- `specific_users`: usa `config.user_ids` (comportamento atual, mantém retrocompatibilidade com `user_id` legado)
- `task_creator`: busca `created_by_user_id` da tarefa (campo existente na tabela `tasks`)
- `task_assignees`: busca todos os `user_id` de `task_assignees` para a tarefa
- `task_followers`: busca todos os `user_id` de `task_followers` para a tarefa

Para retrocompatibilidade, se `target_type` não existir no config, usa o comportamento atual (`user_ids` ou `user_id`).

### Detalhes técnicos

- Nenhuma alteração de banco de dados é necessária
- A tabela `tasks` já possui `created_by_user_id`
- As tabelas `task_assignees` e `task_followers` já existem
- Automações existentes com `user_id` continuarão funcionando pela lógica de fallback

