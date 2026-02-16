

# Implementar Acao "Mover Tarefa" e Outras Acoes Faltantes no Motor de Automacoes

## Problema

A acao `move_task` (Mover tarefa) esta definida na interface do construtor de automacoes (`actionCategories.ts`), porem **nao esta implementada** no motor de execucao (`useStatusChangeAutomations.ts`). Quando a automacao dispara, o switch/case no metodo `executeAction` cai no `default` e apenas imprime um log no console, sem executar nenhuma acao.

Acoes faltantes no motor de execucao:

| Acao | Status |
|------|--------|
| `move_task` | **Nao implementada** (prioridade do usuario) |
| `set_start_date` | **Nao implementada** (presente na automacao do usuario) |
| `remove_assignee` | **Nao implementada** |
| `remove_all_assignees` | **Nao implementada** |
| `auto_add_follower` / `add_follower` | **Nao implementada** |
| `send_notification` | **Nao implementada** |
| `send_webhook` | **Nao implementada** |

## Solucao

Implementar todas as acoes faltantes no arquivo `src/hooks/useStatusChangeAutomations.ts`, adicionando os cases no switch e as funcoes de execucao correspondentes.

## Detalhes Tecnicos

### `src/hooks/useStatusChangeAutomations.ts`

**1. Adicionar case `move_task` no switch (linha 350-386):**

```typescript
case 'move_task':
  await executeMoveTask(info, config, automationName);
  break;

case 'set_start_date':
  await executeSetStartDate(info, config, automationName);
  break;

case 'remove_assignee':
  await executeRemoveAssignee(info, config, automationName);
  break;

case 'remove_all_assignees':
  await executeRemoveAllAssignees(info, automationName);
  break;

case 'auto_add_follower':
case 'add_follower':
  await executeAddFollower(info, config, automationName);
  break;

case 'send_notification':
  await executeSendNotification(info, config, automationName);
  break;

case 'send_webhook':
  await executeSendWebhook(info, config, automationName);
  break;
```

**2. Implementar `executeMoveTask`:**

- Ler `config.target_list_id`
- Atualizar `tasks.list_id` para o novo list_id
- Registrar atividade de automacao

**3. Implementar `executeSetStartDate`:**

- Mesma logica de `executeSetDueDate` mas atualizando o campo `start_date`
- Suportar `days_from_now` e data fixa

**4. Implementar `executeRemoveAssignee`:**

- Ler `config.user_id` ou `config.user_ids`
- Deletar de `task_assignees`

**5. Implementar `executeRemoveAllAssignees`:**

- Deletar todos os registros de `task_assignees` para o `task_id`

**6. Implementar `executeAddFollower`:**

- Ler `config.user_ids`
- Upsert em `task_followers`

**7. Implementar `executeSendNotification`:**

- Inserir em tabela `notifications` com a mensagem configurada

**8. Implementar `executeSendWebhook`:**

- Fazer fetch POST para a URL configurada com dados da tarefa

### Importante: Atualizacao do `info` entre acoes

Quando `move_task` e executado antes de `set_status` em uma sequencia de multiplas acoes, o `listId` no objeto `info` precisa ser atualizado para que acoes subsequentes (como `set_status`) usem o contexto correto da nova lista. Isso sera tratado passando um objeto mutavel ou retornando o novo estado.

### Arquivo modificado

- `src/hooks/useStatusChangeAutomations.ts` - adicionar implementacao de todas as acoes faltantes

Nenhuma alteracao no banco de dados necessaria.
