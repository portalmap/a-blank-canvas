# Ao desconectar o Google, limpar os compromissos importados

## O que acontece hoje

Desconectar remove a autorização e a conta da lista de Integrações, mas os compromissos que vieram do Google continuam salvos na Agenda — inclusive os futuros. Nada é limpo.

## Comportamento desejado

Ao desconectar uma conta Google (pelo botão em **Configurações > Integrações**):

1. Compromissos que vieram do Google e começam **a partir do momento da desconexão** são apagados da Agenda.
2. Compromissos do Google que já aconteceram (antes da desconexão) ficam preservados como histórico e passam a ser apenas locais — sem vínculo com o Google.
3. Compromissos criados aqui dentro (locais) não são tocados, mesmo se estavam espelhados no Google.
4. Nada é apagado no Google: a limpeza é só do lado do MAP Flow.
5. Ao reconectar, a sincronização traz novamente os compromissos do Google, sem duplicar (o vínculo é recriado pelo identificador do evento no Google).

## Detalhes técnicos

- `src/lib/google-calendar.functions.ts`, em `disconnectGoogleCalendarAccount`, após remover a chave de conexão e a linha de `calendar_google_accounts`, com o cliente de serviço:
  - `DELETE from calendar_events where user_id = :userId and source = 'google' and start_at >= now()`;
  - `UPDATE calendar_events set source = 'local', google_event_id = null, google_calendar_id = null where user_id = :userId and source = 'google'` (restam apenas os passados);
  - manter tudo em uma sequência com tratamento de erro, retornando `{ ok: true, removidos, mantidos }` para a UI poder informar.
- Confirmar os nomes reais das colunas de vínculo em `calendar_events` (`source`, `google_event_id`, `google_calendar_id`, `start_at`, `deleted_at`) antes de escrever a consulta; se houver `deleted_at`, os futuros vinculados ao Google são removidos de fato (delete), pois não devem voltar como "excluídos pendentes de sincronização".
- `src/hooks/useGoogleCalendar.ts` (`useDisconnectGoogleAccount`): além de `google-calendar-accounts` e `google-calendar-status`, invalidar `agenda-events` para a Agenda atualizar na hora, e mostrar no aviso quantos compromissos futuros foram removidos.
- Sem alteração de esquema no banco e sem chamadas ao Google no processo de desconexão.

## Verificação

1. Conectar, sincronizar e confirmar compromissos do Google na Agenda.
2. Desconectar em **Configurações > Integrações**.
3. Abrir a Agenda: os compromissos futuros do Google desaparecem; os passados continuam visíveis.
4. Reconectar e sincronizar: os compromissos do Google voltam, sem duplicatas.
