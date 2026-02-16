

# Automacao de Atribuicao ao Criar ou Mover Tarefas

## Situacao Atual

A logica de backend ja chama `applyAutomationsToTask` tanto na criacao quanto na movimentacao de tarefas, mas:

1. O gatilho usado pelo botao "Atribuicao Automatica" e `on_task_created`
2. Na interface de automacoes, esse gatilho aparece como "Tarefa ou subtarefa criada", dando a impressao de que so funciona na criacao
3. Existem gatilhos separados para mover (`on_task_moved_here`) e adicionar (`on_task_added_here`), mas eles nao sao processados pelo `applyAutomationsToTask`

## Solucao

Fazer o `applyAutomationsToTask` buscar automacoes com qualquer um dos tres gatilhos relevantes: `on_task_created`, `on_task_moved_here` e `on_task_added_here`. Assim, o usuario pode criar automacoes usando qualquer um desses gatilhos e todas serao executadas quando uma tarefa entrar na lista.

Alem disso, atualizar o label do gatilho nos botoes rapidos para deixar claro o comportamento.

## Detalhes Tecnicos

### 1. Arquivo: `src/hooks/useApplyAutomations.ts`

Alterar a query na linha 45 para buscar automacoes com multiplos triggers:

De:
```typescript
.eq('trigger', 'on_task_created')
```

Para:
```typescript
.in('trigger', ['on_task_created', 'on_task_moved_here', 'on_task_added_here'])
```

Isso garante que automacoes criadas com qualquer um desses gatilhos sejam executadas quando uma tarefa entra em uma lista (por criacao ou movimentacao).

### 2. Arquivo: `src/components/automations/QuickAutomationButtons.tsx`

Atualizar a descricao gerada ao criar a automacao para usar linguagem que reflita o comportamento real. Nenhuma mudanca de trigger necessaria, pois o `on_task_created` ja e coberto pela query atualizada.

### Resumo

- 1 arquivo principal modificado: `src/hooks/useApplyAutomations.ts` (query de triggers)
- 1 arquivo de texto: `src/components/automations/QuickAutomationButtons.tsx` (descricao)
- Nenhuma alteracao de banco de dados
- Qualquer automacao com gatilho de criacao, movimentacao ou adicao passara a executar quando uma tarefa entra na lista

