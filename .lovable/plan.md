# Confirmação de presença (Sim / Não / Talvez) na Agenda

Objetivo: poder responder aos convites do Google direto daqui, com as três opções do Google — Sim (aceito), Não (recusado) e Talvez (provisório) — e a resposta chegar no Google e nos organizadores.

## O que muda para você

- Ao abrir um compromisso em que você foi convidado (evento vindo do Google ou criado aqui), aparecem três botões: **Sim**, **Não** e **Talvez**, com destaque na opção já escolhida.
- Nas visões de mês e semana, o compromisso mostra um sinal da sua resposta: aceito (cheio), talvez (contorno pontilhado) e recusado (título riscado, mais apagado).
- Se você recusar, o compromisso continua na agenda, apenas marcado como recusado (mesmo comportamento do Google).
- Quando você é o organizador, o dialogo lista os convidados com a resposta de cada um (Sim / Não / Talvez / Sem resposta), atualizada a cada sincronização.
- A resposta é enviada ao Google e aos organizadores; se a conta do Google não estiver conectada, a resposta é registrada apenas aqui.
- Tarefas do Google não têm confirmação de presença (o Google também não oferece); nelas continua apenas concluir/reabrir.

## Detalhes técnicos

1. Banco (migration)
   - `calendar_event_guests.response_status`: passar a aceitar `needsAction | accepted | declined | tentative` (checagem por trigger de validação, não CHECK imutável), padrão `needsAction`.
   - `calendar_events.response_status`: mesma normalização, usado para a resposta do próprio dono da linha importada do Google.
   - Sem novas tabelas; grants/RLS existentes permanecem.

2. `src/hooks/useAgenda.ts`
   - Ampliar `useRespondInvite` para aceitar `'accepted' | 'declined' | 'tentative'`.
   - Atualizar as duas pontas: `calendar_event_guests` (quando o usuário é convidado) e `calendar_events.response_status` (quando é a cópia importada do Google do próprio usuário).
   - Após gravar, chamar a função de servidor de RSVP e invalidar as queries da agenda.

3. `src/lib/googleCalendarSync.server.ts`
   - Nova rotina `pushRsvp(userId, eventId, status)`: `PATCH /calendar/v3/calendars/{calendarId}/events/{eventId}?sendUpdates=all`, enviando o array `attendees` com a entrada `self` atualizada para o `responseStatus` escolhido.
   - No pull, além de `response_status` do próprio usuário, gravar a resposta de cada convidado (`attendees[].responseStatus`) em `calendar_event_guests`, casando por e-mail.
   - Manter a janela de sincronização e os tokens por agenda como estão.

4. `src/lib/google-calendar.functions.ts`
   - Nova server function autenticada `respondCalendarInvite` (`{ eventId, status }`), que valida se o usuário é dono/convidado do evento e chama `pushRsvp`; erro do Google é devolvido sem quebrar a resposta local.

5. UI
   - `src/components/agenda/AgendaEventDialog.tsx`: bloco “Sua resposta” com os três botões para convites; lista de convidados com o status de resposta para o organizador.
   - `src/components/agenda/AgendaMonthView.tsx`, `AgendaWeekView.tsx`, `AgendaListView.tsx`: estilo conforme a resposta (aceito / talvez / recusado) reaproveitando o helper de ícones já existente.
   - Nenhuma mudança fora do módulo Agenda.
