# Diagnóstico — lógica de produtividade (nada alterado)

## Cálculo base

A produtividade parte de três datas de uma tarefa:

- `start_date` — quando a tarefa começou;
- `due_date` — prazo final;
- `completed_at` — data de conclusão (se houver).

A **data de referência** é `completed_at` quando a tarefa está concluída; caso contrário, é a data/hora atual.

### Percentual de entrega

```text
percentual = (referencia - start_date) / (due_date - start_date) * 100
```

- Se o prazo total for zero ou negativo, retorna 200% (máximo atraso).
- Representa "quanto do prazo já foi consumido".

### Score de produtividade

```text
score = 200 - percentual_de_entrega, limitado entre 0 e 200
```

- Quanto mais cedo a tarefa foi entregue, maior o score.
- Entrega exatamente no prazo → score 100.
- Atraso total → score 0.

### Classificação

Usa os limiares configuráveis em `productivity_settings`:

```text
early_threshold_percent   padrão 50
on_time_threshold_percent padrão 100
```

Classificações:

```text
percentual <= early_threshold  → early      (Antecipada)
percentual <= on_time_threshold → on_time    (Em dia / No prazo)
percentual > on_time_threshold → late       (Atrasada)
```

Tarefas sem `start_date` ou sem `due_date` não entram no cálculo de percentual no indicador individual (`useTaskProductivityClassification` retorna `null`). Nas estatísticas agregadas, elas caem na categoria `noDueDate` (Sem prazo).

## Regras por pessoa

As funções de ranking e relatórios filtram as tarefas atribuídas a uma pessoa:

- Atribuição atual: `task_assignees.user_id`.
- Atribuições históricas (tarefas transferidas): `task_assignee_history`.

A flag `includeTransferred` controla se tarefas que a pessoa já teve mas não tem mais contam para ela.

Métricas por pessoa:

```text
early       → tarefas concluídas abaixo do limiar "early"
onTime      → concluídas entre early e on_time
late        → concluídas acima de on_time
noDueDate   → concluídas sem start_date/due_date
productivityScore → média dos scores
```

## Regras por lista / pasta / space

As estatísticas por escopo (`scope`) agregam as tarefas de uma localização sem filtrar por pessoa:

```text
workspace → todas as tarefas do workspace
space     → tasks cujo list_id pertence ao space (via lists.space_id)
folder    → tasks cujo list_id pertence a uma pasta (lists.folder_id)
list      → tasks de uma lista específica
```

A contagem segue as mesmas classificações (`early`, `on_time`, `late`, `noDueDate`), mas sem vínculo com usuário.

## Onde isso é usado

- `TaskProductivityIndicator.tsx`: bolinha colorida nas tarefas com tooltip.
- `useProductivityStats.ts`, `useProductivityRanking.ts`, `useProductivityDetailsReport.ts`, `useAccountProductivity.ts`, `useUserProductivityDetails.ts`: painéis e relatórios de produtividade.
- `useProductivityClassification.ts`: funções puras de cálculo.

## Observações

- O cálculo usa hora do dia: `start_date` começa às `00:00:00` e `due_date` termina às `23:59:59`.
- Tarefas sem prazo não geram score nem percentual; são contadas só como volume (`noDueDate`).
- A classificação depende dos limiares do workspace; se não houver configuração, usa 50/100.

Nada será alterado — apenas diagnóstico.
