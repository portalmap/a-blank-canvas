
# Correção da duplicidade e da falta de atribuição nas automações

## Diagnóstico

Do I know what the issue is? Sim.

O problema principal não é mais o gatilho da automação de destino. Ele já está correto.

### O que confirmei
- A tarefa `de29ae2b-e3f5-40ef-a100-2a48846fe4b6` está hoje na lista `Plan. de Criativos | Accerth`.
- A automação de autoatribuição dessa lista existe e já tem:
  - `trigger: on_task_created`
  - `or_triggers: [on_task_added_here, on_task_moved_here]`
- Mesmo assim, a tarefa termina sem responsável.

### Evidência do erro real
No histórico dessa tarefa, a mesma automação:
`Automação para enviar demanda do Designer > Social Media`

rodou 2 vezes seguidas:

```text
23:50:13 task.moved
23:50:15 task.moved
23:50:19 assignees.cleared
23:50:21 assignees.cleared
```

Ou seja:
- a automação de origem está disparando em duplicidade
- ela limpa os responsáveis 2 vezes
- a atribuição da lista destino acaba sendo anulada pela segunda execução

## Causa técnica

Em `src/hooks/useStatusChangeAutomations.ts`:

- `executeTagAutomations` e `reevaluateConditionAutomations` já têm proteção contra execução duplicada recente
- `executeStatusChangeAutomations` não tem essa proteção antes de executar
- ele só grava em `automation_executions` depois, e ainda assim apenas em alguns casos

Isso permite duas execuções concorrentes da mesma automação de status.

## O que vou ajustar

### 1. Blindar `executeStatusChangeAutomations` contra execução dupla
Editar `src/hooks/useStatusChangeAutomations.ts` para:

- criar uma chave de execução por:
  - `automation_id`
  - `task_id`
  - `newStatusId`
- verificar se a mesma automação já foi executada nos últimos segundos
- registrar a execução antes de rodar a sequência
- pular a segunda chamada quando ela for duplicada

Isso resolve em todas as áreas que mudam status, porque todas passam por esse mesmo executor.

### 2. Padronizar a deduplicação entre todos os caminhos de automação
No mesmo arquivo, consolidar a mesma regra para:
- `executeStatusChangeAutomations`
- `executeTagAutomations`
- `reevaluateConditionAutomations`

Assim a proteção fica consistente, e não depende de um fluxo ter guarda e outro não.

### 3. Garantir que a automação de entrada continue no final
Manter a chamada de `applyAutomationsToTask(...)` só depois que a cadeia da automação terminar.

Isso preserva a ordem correta:
```text
mover -> ajustar campos -> limpar antigos -> aplicar automações da lista destino
```

### 4. Fortalecer a aplicação de automações de entrada
Editar `src/hooks/useApplyAutomations.ts` para deixar o fluxo mais seguro:
- tratar apenas as automações de entrada relevantes
- garantir que autoatribuição rode no fechamento do fluxo
- adicionar logs/retorno mais claros para diferenciar:
  - “não havia automação aplicável”
  - “automação encontrou usuário”
  - “atribuição foi aplicada”

## Arquivos

- `src/hooks/useStatusChangeAutomations.ts`
- `src/hooks/useApplyAutomations.ts`

## Resultado esperado

Depois da correção:

- a automação “Enviar demanda do Designer > Social Media” não vai mais rodar 2 vezes
- `assignees.cleared` não vai mais aparecer duplicado
- ao entrar na lista destino, o responsável da lista será aplicado corretamente
- a correção valerá para todas as áreas que disparam automações por status
