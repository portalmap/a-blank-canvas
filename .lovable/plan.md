
# Re-avaliar Automacoes Quando Condicoes Mudam (Tag, Prioridade, etc.)

## Problema

Atualmente, as automacoes so sao avaliadas no **momento exato** da mudanca de status. Se o usuario muda o status primeiro e depois adiciona a tag, a automacao nao dispara porque:

1. No momento da mudanca de status, a tag nao existia -- a condicao falha
2. Quando a tag e adicionada depois, ninguem re-avalia as automacoes

O usuario quer que a ordem nao importe: se o status ja esta no estado correto E a tag e adicionada, a automacao deve disparar.

## Solucao

Criar uma funcao `reevaluateConditionAutomations` que e chamada sempre que um campo relevante para condicoes muda (tag adicionada/removida, prioridade alterada, etc.). Essa funcao:

1. Busca todas as automacoes com condicoes que dependem do campo alterado
2. Verifica se o gatilho (trigger) ja foi satisfeito pelo estado atual da tarefa (ex: o status atual esta nos `to_status_ids`)
3. Se o gatilho ja foi cumprido E as condicoes agora sao verdadeiras, executa as acoes

Para evitar execucoes duplicadas, sera adicionada uma tabela de controle ou um campo de "ultimo status avaliado" para rastrear quais automacoes ja foram executadas para aquela tarefa.

## Detalhes Tecnicos

### 1. `src/hooks/useStatusChangeAutomations.ts` - Nova funcao

Adicionar `reevaluateConditionAutomations`:

```typescript
export const reevaluateConditionAutomations = async (
  taskId: string,
  workspaceId: string
): Promise<void> => {
  // 1. Buscar dados atuais da tarefa (status, list_id)
  const { data: task } = await supabase
    .from('tasks')
    .select('id, status_id, list_id, workspace_id')
    .eq('id', taskId)
    .single();

  if (!task) return;

  // 2. Buscar hierarquia de escopo
  const { data: list } = await supabase
    .from('lists')
    .select('id, space_id, folder_id')
    .eq('id', task.list_id)
    .single();

  // 3. Buscar automacoes on_status_changed com condicoes
  const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .eq('trigger', 'on_status_changed')
    .eq('enabled', true)
    .eq('workspace_id', workspaceId);

  // 4. Para cada automacao com condicoes:
  //    - Verificar se o status ATUAL da tarefa satisfaz to_status_ids
  //    - Avaliar condicoes com dados frescos
  //    - Se tudo bater, executar acoes
  //    - Usar tabela automation_executions para evitar duplicatas
};
```

### 2. `src/hooks/useTaskTags.ts` - Chamar re-avaliacao

No `useAddTaskTag` e `useRemoveTaskTag`, apos a operacao, chamar `reevaluateConditionAutomations`:

```typescript
export function useAddTaskTag() {
  return useMutation({
    mutationFn: async ({ taskId, tagId }) => {
      // ... insert existente ...
    },
    onSuccess: async (_, variables) => {
      // ... invalidateQueries existente ...
      
      // Buscar workspace_id da tarefa e re-avaliar
      const { data: task } = await supabase
        .from('tasks')
        .select('workspace_id')
        .eq('id', variables.taskId)
        .single();
      
      if (task) {
        reevaluateConditionAutomations(variables.taskId, task.workspace_id);
      }
    },
  });
}
```

### 3. Prevencao de duplicatas - Tabela `automation_executions`

Criar tabela para registrar execucoes e evitar que a mesma automacao execute duas vezes para a mesma tarefa no mesmo "ciclo":

```sql
CREATE TABLE automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  status_id UUID, -- o status que disparou
  executed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(automation_id, task_id, status_id)
);
```

Antes de executar, verificar se ja existe registro. Quando o status muda novamente, o registro antigo nao impede (pois o status_id e diferente).

### 4. Fluxo resumido

```text
Cenario: Status muda primeiro, tag adicionada depois

1. Usuario muda status para "Concluido"
   -> executeStatusChangeAutomations() dispara
   -> Condicao "tag = enviar social media" -- NAO TEM a tag
   -> Automacao NAO executa (correto)

2. Usuario adiciona tag "enviar social media"
   -> useAddTaskTag.onSuccess
   -> reevaluateConditionAutomations(taskId, workspaceId)
   -> Busca automacoes com condicoes
   -> Status atual = "Concluido" esta em to_status_ids? SIM
   -> Tag "enviar social media" presente? SIM
   -> Ja executou para este status? NAO
   -> EXECUTA automacao!
   -> Registra em automation_executions
```

### Arquivos modificados

- `src/hooks/useStatusChangeAutomations.ts` - adicionar `reevaluateConditionAutomations` + registrar execucoes em `executeStatusChangeAutomations`
- `src/hooks/useTaskTags.ts` - chamar re-avaliacao no `onSuccess` de add/remove tag
- Nova migracao SQL para criar tabela `automation_executions`
