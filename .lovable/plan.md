

# Adicionar Recorrencia Diretamente na Tarefa

## Visao Geral

Permitir configurar recorrencia individualmente em cada tarefa, diretamente na tela de detalhe da tarefa (TaskMainContent). Quando o status da tarefa mudar para um status de "conclusao", o sistema executara automaticamente a acao de recorrencia configurada (criar nova tarefa ou resetar status).

## Alteracoes no Banco de Dados

Adicionar coluna `recurrence_config` (JSONB, nullable) na tabela `tasks` para armazenar a configuracao de recorrencia por tarefa.

```text
Estrutura do JSONB:
{
  "recurrence_type": "daily" | "weekly" | "biweekly" | "monthly" | "quarterly",
  "day_of_week": "monday" | "tuesday" | ... (para weekly/biweekly),
  "monthly_mode": "first_day" | "last_day" | "specific_day" (para monthly/quarterly),
  "day_of_month": 15 (quando monthly_mode = specific_day),
  "trigger_on_status_id": "uuid-do-status-de-conclusao",
  "skip_weekends": true/false,
  "repeat_forever": true/false,
  "on_complete_action": "create_new_task" | "update_status",
  "reset_status_id": "uuid-do-status-destino" (quando on_complete_action = update_status)
}
```

## Novo Componente: TaskRecurrenceConfig

Criar `src/components/tasks/TaskRecurrenceConfig.tsx` que:
- Exibe um botao/secao "Recorrencia" na tela de detalhe da tarefa (abaixo das etiquetas, antes da descricao)
- Ao clicar, abre um painel/collapsible com os controles de configuracao
- Reutiliza a mesma logica visual do `ActionConfigForm.tsx` (frequencia, dia da semana, opcoes de conclusao)
- Salva/atualiza o campo `recurrence_config` na tarefa via `useUpdateTask`

**Campos do componente:**
- Frequencia (diariamente, semanal, quinzenal, mensal, trimestral)
- Dia da semana (para semanal/quinzenal)
- Dia do periodo (para mensal/trimestral)
- Status que dispara a recorrencia (lista de status "done")
- Checkbox: Ignorar fins de semana
- Checkbox: Repetir para sempre
- Acao ao concluir: Criar nova tarefa OU Atualizar status para X
- Botao para remover recorrencia

## Integracao com TaskMainContent

Adicionar o componente `TaskRecurrenceConfig` na tela de detalhe, entre as etiquetas (TaskTagsSelector) e o Separator antes da descricao.

## Integracao com o Motor de Execucao

Atualizar `src/hooks/useStatusChangeAutomations.ts` > `executeStatusChangeAutomations` para, alem de verificar automacoes da tabela `automations`, tambem verificar se a tarefa possui `recurrence_config` e se o novo status corresponde ao `trigger_on_status_id`. Se sim, executar a acao de recorrencia:

- **create_new_task**: Duplica a tarefa com as datas recalculadas conforme a frequencia e reseta o status para o primeiro status ativo.
- **update_status**: Muda o status da tarefa para `reset_status_id` e recalcula as datas.

## Atualizacao do Hook useUpdateTask

Garantir que o hook `useUpdateTask` suporte atualizar o campo `recurrence_config` (JSONB).

## Resumo de Arquivos

| Arquivo | Alteracao |
|---|---|
| Migracao SQL | Adicionar coluna `recurrence_config` (JSONB nullable) na tabela `tasks` |
| `src/components/tasks/TaskRecurrenceConfig.tsx` | Novo componente com UI de configuracao de recorrencia |
| `src/components/tasks/TaskMainContent.tsx` | Incluir o `TaskRecurrenceConfig` na tela de detalhe |
| `src/hooks/useTasks.ts` | Suportar `recurrence_config` no update |
| `src/hooks/useStatusChangeAutomations.ts` | Verificar e executar recorrencia por tarefa ao mudar status |

## Logica de Calculo de Datas

Ao disparar a recorrencia, as novas datas serao calculadas com base na frequencia:
- **daily**: +1 dia util (respeitando skip_weekends)
- **weekly**: proximo dia da semana configurado
- **biweekly**: +14 dias ao dia da semana configurado
- **monthly**: proximo mes no dia/modo configurado
- **quarterly**: +3 meses no dia/modo configurado

A `start_date` e `due_date` serao recalculadas mantendo o mesmo intervalo entre elas que existia na tarefa original.

