# Agenda: só meus compromissos e contagem "+N" correta

## O problema (verificado)

- A sua agenda hoje tem **6.895 compromissos vindos das agendas de outras pessoas** (Rodrigo 1.500, Mirian 1.155, Wendy 921, Emanuela 727, Lucas 630, Débora 484, Amanda 344, Fábio 213 e outras), além de 811 da sua agenda principal e 18 de feriados. A sincronização estava trazendo **todas as agendas que você tem acesso**, não só as suas.
- O marcador "+N" mostra números absurdos (+17, +20) porque ele soma todos os compromissos de uma cadeia inteira do dia, e não os que realmente estão no mesmo horário.

## O que muda

Filtro de compromissos
- Passa a entrar na sua agenda só o que é **seu**: compromissos da sua agenda principal, mais qualquer compromisso em que você é o criador/organizador ou está na lista de convidados.
- Agendas de colegas e agendas compartilhadas deixam de ser importadas. Feriados também saem (posso manter se preferir).
- Limpeza dos dados já importados: os 6.895 compromissos que não são seus (nem como criador, nem como convidado) são removidos da sua agenda aqui. Nada é apagado no Google.

Contagem "+N"
- O "+N" passa a contar apenas os compromissos que se cruzam no **mesmo intervalo de horário** daquele ponto, não a cadeia do dia inteiro.
- O marcador aparece no horário do primeiro compromisso oculto, e a lista ao clicar mostra exatamente esses compromissos.
- Com o filtro acima, a maioria dos "+N" gigantes deixa de existir naturalmente.

Mês, Google, convites e demais módulos seguem funcionando igual.

## Detalhes técnicos

- `src/lib/googleCalendarSync.server.ts`
  - Restringir a lista de agendas: usar a agenda principal do usuário; para as demais, só importar eventos em que o e-mail da conta aparece como `organizer`/`creator` ou em `attendees`.
  - Alternativa aplicada em conjunto: nas chamadas de `events`, passar `singleEvents=true` e descartar no `applyPage` eventos sem vínculo com o e-mail da conta.
  - Ignorar agendas de feriados/aniversários (`#holiday@`, `#contacts@`).
- Migração de limpeza (SQL): apagar `calendar_events` do usuário com `source='google'` cujo `google_calendar_id` não é a agenda dele e que não têm registro correspondente em `calendar_event_guests` com o e-mail dele nem `creator/organizer` próprio; remove também convidados e lembretes órfãos.
- `src/components/agenda/AgendaWeekView.tsx`
  - Em `layoutDay`, calcular o excedente por **fatia de tempo**: varrer as bordas de início/fim do grupo, contar simultâneos em cada fatia e gerar um marcador por fatia com mais de `MAX_COLUMNS` compromissos, listando só os daquela fatia.
- Sem mudança em hooks de dados, tipos ou RLS.

## Verificação

1. Contar os compromissos por agenda antes/depois da limpeza (deve ficar só a sua agenda + convites).
2. Abrir Semana/Dia: blocos sem "+17"/"+20"; onde houver "+N", a lista deve ter exatamente aquela quantidade no mesmo horário.
3. Rodar uma nova sincronização e confirmar que agendas de colegas não voltam.
