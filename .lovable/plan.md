# Agenda com os quatro tipos do Google: Evento, Tarefa, Ausente e Hora de se concentrar

O banco já está preparado (cada compromisso guarda o tipo, se a tarefa foi concluída e o vínculo com a tarefa do Google), mas a tela e a sincronização ainda tratam tudo como "evento". Vamos completar, mantendo a Agenda como módulo isolado.

## 1. Botão "Criar" com os quatro tipos

- O botão de criar passa a abrir um menu com: Evento, Tarefa, Ausente, Hora de se concentrar.
- A janela de criação se adapta ao tipo:
  - Evento: como hoje (com convidados).
  - Tarefa: título, data/hora, descrição e caixa "concluída" — sem convidados.
  - Ausente: período e opção "recusar automaticamente convites".
  - Hora de se concentrar: período e descrição.
- Cada tipo ganha um marcador visual próprio (cor/ícone) nas visões Mês, Semana e Lista; tarefas concluídas aparecem riscadas e podem ser marcadas direto na agenda.

## 2. Tarefas do Google indo e voltando

- As tarefas do Google (a lista de tarefas ligada à conta conectada) passam a ser lidas e mostradas na Agenda no dia em que vencem.
- Tarefa criada aqui é criada na conta do Google; editar, concluir ou excluir aqui reflete lá, e o que muda no Google volta para cá.
- Ausente e Hora de se concentrar são criados no Google com o tipo correspondente, e os que vêm do Google entram com o mesmo tipo.
- Isso exige uma permissão nova do Google: será necessário clicar uma vez em "Reconectar" na Agenda e autorizar o acesso às tarefas.

## 3. O que não muda

- Reuniões de terceiros continuam somente leitura; nada é criado em agendas de outras pessoas.
- Ao desconectar, segue a regra atual: o futuro importado sai, o histórico fica.
- As tarefas dos projetos do MAP Flow não entram nessa camada agora (fica para depois, se você quiser).

## Detalhes técnicos

- `useAgenda.ts`: tipo `AgendaItemType` ('event' | 'task' | 'out_of_office' | 'focus_time'), campos `item_type`, `completed_at`, `auto_decline`, `response_status` em `CalendarEvent`/`EventInput`; mutação `useToggleAgendaTask`.
- `AgendaEventDialog.tsx`: seletor de tipo + campos condicionais; convidados só para `event`.
- `Agenda.tsx`: `DropdownMenu` no botão Criar passando o tipo inicial; legenda por tipo.
- `AgendaMonthView/AgendaWeekView/AgendaListView`: estilo por `item_type` e checkbox de conclusão para tarefas.
- `googleCalendarSync.server.ts`: escopo extra `https://www.googleapis.com/auth/tasks`; mapear `eventType` (`default`/`outOfOffice`/`focusTime`) nos dois sentidos; novo bloco push/pull em `/tasks/v1/lists/@default/tasks` gravando `google_task_id`/`google_task_list_id`; `status: 'completed'` ↔ `completed_at`.
- `GOOGLE_SCOPES` em `googleCalendarSync.server.ts` e no fluxo de consentimento de `useGoogleCalendar.ts` precisam ficar iguais, para o "Reconectar" pedir a permissão nova.
