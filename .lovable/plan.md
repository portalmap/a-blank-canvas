
# Modulo de Notificacoes em Tempo Real (Toast)

## Resumo

Criar um sistema de notificacoes via toast (sonner) que aparece em tempo real para o usuario logado. Sem tela de listagem de notificacoes, sem armazenamento obrigatorio. As notificacoes sao pessoais (so para o proprio usuario) e cada uma dispara apenas uma vez. Ao clicar, redireciona para o item relacionado.

## Tipos de Notificacao

| Tipo | Gatilho | Navegacao ao clicar |
|------|---------|-------------------|
| Tarefa atribuida | Nova entrada em `task_assignees` com `user_id = eu` | `/task/{taskId}` |
| Comentario atribuido (tarefa) | Nova entrada em `task_comments` com `assignee_id = eu` | `/task/{taskId}` |
| Comentario atribuido (chat) | Nova mensagem em `chat_messages` com `assignee_id = eu` | `/chat?channel={channelId}&message={msgId}` |
| Tarefa atrasada | Task com `due_date < hoje` e sem `completed_at` | `/task/{taskId}` |
| Tarefa vence amanha | Task com `due_date = amanha` e sem `completed_at` | `/task/{taskId}` |
| Novo post no feed | Nova entrada em `feed_posts` no workspace | `/` (pagina Inicio) |
| Permissao de Space adicionada | Nova entrada em `space_permissions` com `user_id = eu` | `/space/{spaceId}` |
| Permissao de Space removida | Entrada removida de `space_permissions` com `user_id = eu` | Toast informativo apenas |

## Arquitetura

### 1. Realtime (Supabase)

Habilitar realtime nas tabelas que ainda nao tem:
- `task_assignees`
- `task_comments`
- `feed_posts`
- `space_permissions`

(Tabela `chat_messages` ja tem realtime habilitado.)

### 2. Componente `NotificationListener`

Um componente invisivel montado no layout principal (dentro de `ProtectedRoute` em `App.tsx`) que:
- Escuta mudancas realtime nas tabelas acima, filtrando por `user_id = auth.uid()`
- Para tarefas atrasadas/vencendo amanha: faz um polling a cada 5 minutos
- Usa `localStorage` para armazenar IDs ja notificados (previne duplicatas)
- Exibe toast via `sonner` com mensagem e botao de acao (navegar)

### 3. Tab "Notificacoes" em Configuracoes

Nova aba no `Settings.tsx` com toggles simples para habilitar/desabilitar cada tipo de notificacao. Essas configuracoes sao globais (workspace-level), gerenciadas pelo admin.

### 4. Tabela `notification_settings`

Nova tabela no banco para armazenar as preferencias globais do workspace:

```text
notification_settings
- id (uuid, PK)
- workspace_id (uuid, FK, unique)
- task_assigned (boolean, default true)
- comment_assigned (boolean, default true)
- task_due_tomorrow (boolean, default true)
- task_overdue (boolean, default true)
- feed_new_post (boolean, default true)
- space_permission_change (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)
```

RLS: admins podem gerenciar, membros podem ler.

## Detalhes Tecnicos

### Arquivos a criar

1. **`src/components/notifications/NotificationListener.tsx`**
   - Componente invisivel que monta subscricoes Realtime
   - useEffect para polling de tarefas atrasadas/vencendo
   - localStorage keys: `notified_task_assign_{id}`, `notified_overdue_{taskId}_{date}`, etc.
   - Usa `toast()` do sonner com `onClick` para navegacao via `useNavigate`
   - Le configuracoes do workspace via hook

2. **`src/hooks/useNotificationSettings.ts`**
   - Hook para ler/salvar configuracoes de notificacao do workspace
   - Query + Mutation para tabela `notification_settings`

3. **`src/components/settings/NotificationSettings.tsx`**
   - UI com switches para cada tipo de notificacao
   - Layout simples em card com descricoes curtas

### Arquivos a modificar

4. **`src/App.tsx`**
   - Adicionar `<NotificationListener />` dentro do layout protegido

5. **`src/pages/Settings.tsx`**
   - Adicionar aba "Notificacoes" com o componente `NotificationSettings`

### Migracao SQL

- Criar tabela `notification_settings`
- Habilitar realtime em `task_assignees`, `task_comments`, `feed_posts`, `space_permissions`
- RLS policies para a nova tabela

### Logica de "apenas uma vez"

Para cada notificacao, armazenar no localStorage um Set de IDs ja notificados. Exemplos:
- Tarefa atribuida: key = `notif_task_assign`, valor = Set de `task_assignees.id`
- Tarefa atrasada: key = `notif_overdue`, valor = Set de `{taskId}_{date}` (notifica uma vez por dia)
- Tarefa vence amanha: key = `notif_due_tomorrow`, valor = Set de `{taskId}_{date}`
- Limpar entradas com mais de 7 dias para nao acumular

### Formato do Toast

Toast compacto usando `sonner`:
```text
[icone] Titulo curto
Descricao breve
[Botao: Ver →]
```

Duracao: 8 segundos, com botao de acao para navegar.
